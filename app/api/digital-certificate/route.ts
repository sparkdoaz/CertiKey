import { NextRequest, NextResponse } from 'next/server';
import { CertificateRequest, CertificateResponse, CertificateApiError } from '../../../types/digital-certificate';
import { validateFields } from '../../../lib/certificate-validation';
import { createClient } from '@supabase/supabase-js';
import { createCertificate, handleAPIError } from '../../../lib/issuer-api';

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {

    // 從請求 header 獲取 Authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED', 
          message: '未授權：缺少有效的認證憑證' 
        } as CertificateApiError,
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // 使用用戶的 token 建立 Supabase 客戶端
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // 驗證用戶身份並獲取用戶資訊
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED', 
          message: '認證失敗：無效的認證憑證' 
        } as CertificateApiError,
        { status: 401 }
      );
    }

    // 解析請求內容 - bookingId 必填, sharedCardId 選填(同住者需提供)
    let body: { bookingId: string; sharedCardId?: string };
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'INVALID_JSON', 
          message: '請求格式錯誤，請提供有效的 JSON 格式' 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    // 驗證必要欄位
    if (!body.bookingId) {
      return NextResponse.json(
        { 
          error: 'MISSING_REQUIRED_FIELDS', 
          message: '缺少必要欄位：bookingId' 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    // 從資料庫獲取完整的 booking 資料(透過 RLS 自動驗證權限)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        property:properties(*),
        guest:user_profiles(*)
      `)
      .eq('id', body.bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Failed to fetch booking:', bookingError);
      return NextResponse.json(
        { 
          error: 'BOOKING_NOT_FOUND', 
          message: '找不到訂單資料或您無權存取此訂單' 
        } as CertificateApiError,
        { status: 404 }
      );
    }

    // 判斷是主住者還是同住者
    let guestType: 'primary' | 'co-guest' = 'primary';
    let sharedCardId: string | null = null;

    if (booking.guest_id === user.id) {
      // 主住者
      guestType = 'primary';
    } else {
      // 可能是同住者,需要驗證 shared_room_cards
      if (!body.sharedCardId) {
        return NextResponse.json(
          { 
            error: 'FORBIDDEN', 
            message: '您不是主住者,請提供 sharedCardId' 
          } as CertificateApiError,
          { status: 403 }
        );
      }

      // 驗證共享房卡記錄
      const { data: sharedCard, error: sharedCardError } = await supabase
        .from('shared_room_cards')
        .select('*')
        .eq('id', body.sharedCardId)
        .eq('booking_id', body.bookingId)
        .eq('status', 'accepted')
        .single();

      if (sharedCardError || !sharedCard) {
        console.warn('Invalid shared card access attempt:', {
          userId: user.id,
          bookingId: body.bookingId,
          sharedCardId: body.sharedCardId
        });
        return NextResponse.json(
          { 
            error: 'FORBIDDEN', 
            message: '找不到有效的共享房卡記錄或尚未接受邀請' 
          } as CertificateApiError,
          { status: 403 }
        );
      }

      // 驗證是否為受邀者
      if (sharedCard.invitee_id !== user.id && sharedCard.invitee_email !== user.email) {
        console.warn('Unauthorized shared card access:', {
          userId: user.id,
          userEmail: user.email,
          sharedCard
        });
        return NextResponse.json(
          { 
            error: 'FORBIDDEN', 
            message: '您無權使用此共享房卡' 
          } as CertificateApiError,
          { status: 403 }
        );
      }

      guestType = 'co-guest';
      sharedCardId = body.sharedCardId;
    }

    // 記錄操作日誌
    console.log('Certificate request authorized:', {
      userId: user.id,
      userEmail: user.email,
      bookingId: body.bookingId,
      guestType,
      sharedCardId,
      timestamp: new Date().toISOString()
    });

    // 驗證必要的用戶資料
    if (!booking.guest?.national_id) {
      return NextResponse.json(
        { 
          error: 'MISSING_USER_DATA', 
          message: '用戶資料不完整：缺少身分證字號，請先完善個人資料' 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    if (!booking.guest?.email) {
      return NextResponse.json(
        { 
          error: 'MISSING_USER_DATA', 
          message: '用戶資料不完整：缺少 Email' 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    if (!booking.room_number) {
      return NextResponse.json(
        { 
          error: 'MISSING_BOOKING_DATA', 
          message: '訂單資料不完整：缺少房號' 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    // 格式化日期為 YYYYMMDD
    const formatDate = (dateString: string): string => {
      const d = new Date(dateString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    // 格式化日期時間為 YYYYMMDDTHHMM
    const formatDateTime = (dateString: string): string => {
      const d = new Date(dateString);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      return `${year}${month}${day}T${hour}${minute}`;
    };

    // 處理訂單標題（非必填，優先使用 vc_title）
    const getBookingTitle = (): string => {
      console.log('Generating booking title for VC:', {
        vc_title: booking.property?.vc_title,
        title: booking.property?.title
      });

      
      // 優先使用 vc_title (如果有設定)
      if (booking.property?.vc_title) {
        return booking.property.vc_title.substring(0, 50);
      }
      
      // 否則從 title 過濾
      const propertyTitle = booking.property?.title || '';
      // 只保留英文、數字和底線
      const sanitized = propertyTitle.replace(/[^a-zA-Z0-9_]/g, '');
      return sanitized.substring(0, 50); // 回傳空字串也可以（非必填）
    };

    // 處理發行日期（非必填）
    const getIssuedDate = (): string => {
      // 使用當前時間作為發行日期
      return formatDate(new Date().toISOString());
    };

    // 生成 nonce（必填，用於防重放攻擊和區分多張憑證）
    const generateNonce = async (): Promise<string> => {
      const issuedDate = getIssuedDate();
      // 組合: booking.id + user.id + issuedDate
      const data = `${booking.id}${user.id}${issuedDate}`;
      
      // 使用 Web Crypto API 進行 SHA-256 hash
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      
      // 將 hash 結果轉為 hex 字串
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // 取後 4 個字元並轉為大寫(確保只有英數字)
      return hashHex.slice(-4).toUpperCase();
    };

    // 生成 nonce (儲存以便後續撤銷時識別)
    const nonce = await generateNonce();

    // 組裝 API 請求資料 (依照新版規格)
    const requestData: CertificateRequest = {
      vcUid: `00000000_certikey_2`,
      issuanceDate: getIssuedDate(), // 使用當前日期作為發行日期，不能是未來時間
      expiredDate: formatDate(booking.check_out_date),
      fields: [
        // 基本欄位 - 必填
        { ename: "id_number", content: booking.guest.national_id },
        { ename: "name", content: (booking.guest.name || "Guest").replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '') },
        
        // 自定義欄位 - 必填
        { ename: "member_serial", content: booking.guest_id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) },
        { ename: "checkin_time", content: formatDateTime(booking.check_in_date) },
        { ename: "checkout_time", content: formatDateTime(booking.check_out_date) },
        { ename: "booking_id", content: booking.id },
        { ename: "room_num", content: booking.room_number.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10) },
        { ename: "nonce", content: nonce },
        
        // 自定義欄位 - 非必填
        { ename: "email", content: booking.guest.email },
        { ename: "booking_title", content: getBookingTitle() },
        { ename: "issued_date", content: getIssuedDate() },
      ]
    }

    // 驗證欄位內容並進行數據標準化
    const validation = validateFields(requestData.fields);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          message: '欄位驗證失敗', 
          details: validation.errors 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    // 使用標準化後的欄位
    requestData.fields = validation.normalizedFields;

    // 驗證日期格式
    const datePattern = /^\d{8}$/;
    if (!datePattern.test(requestData.issuanceDate) || !datePattern.test(requestData.expiredDate)) {
      return NextResponse.json(
        { 
          error: 'INVALID_DATE_FORMAT', 
          message: '日期格式錯誤，請使用 YYYYMMDD 格式' 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    // 檢查日期邏輯 (發證日期不能晚於到期日期)
    const issuanceDate = new Date(
      parseInt(requestData.issuanceDate.substring(0, 4)),
      parseInt(requestData.issuanceDate.substring(4, 6)) - 1,
      parseInt(requestData.issuanceDate.substring(6, 8))
    );
    const expiredDate = new Date(
      parseInt(requestData.expiredDate.substring(0, 4)),
      parseInt(requestData.expiredDate.substring(4, 6)) - 1,
      parseInt(requestData.expiredDate.substring(6, 8))
    );

    if (issuanceDate >= expiredDate) {
      return NextResponse.json(
        { 
          error: 'INVALID_DATE_RANGE', 
          message: '發證日期不能晚於或等於到期日期' 
        } as CertificateApiError,
        { status: 400 }
      );
    }

    // 呼叫外部 API
    console.log('Calling external API with request payload:', JSON.stringify(requestData, null, 2));

    let responseData: CertificateResponse;
    try {
      responseData = await createCertificate(requestData);
    } catch (error) {
      console.error('External API error:', error);

      const apiError = handleAPIError({ ok: false, status: 500 } as Response, { message: error instanceof Error ? error.message : 'Unknown error' });

      return NextResponse.json(
        {
          error: apiError.error,
          message: apiError.message,
          details: apiError.details
        } as CertificateApiError,
        { status: 500 }
      );
    }

    // 驗證回應格式
    if (!responseData.transactionId || !responseData.qrCode || !responseData.deepLink) {
      console.error('Invalid external API response format:', responseData);
      return NextResponse.json(
        { 
          error: 'INVALID_RESPONSE_FORMAT', 
          message: '外部 API 回應格式不完整' 
        } as CertificateApiError,
        { status: 502 }
      );
    }

    // 記錄成功的請求
    console.log('Certificate request successful:', {
      vcUid: requestData.vcUid,
      transactionId: responseData.transactionId
    });

    // 儲存憑證記錄到資料庫
    // 注意: qr_code 和 deep_link 是一次性的,不儲存
    // 可以透過 transactionId 隨時查詢最新狀態
    try {
      const { data: certificate, error: dbError } = await supabase
        .from('digital_certificates')
        .insert({
          booking_id: body.bookingId,
          user_id: user.id,
          transaction_id: responseData.transactionId,
          nonce: nonce, // 儲存 nonce 用於撤銷時識別
          shared_card_id: sharedCardId,
          guest_type: guestType,
          status: 'pending' // 剛建立,等待用戶掃描 QR Code
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to save certificate to database:', dbError);
        // 不影響主流程,繼續回傳結果
      } else {
        console.log('Certificate saved to database:', {
          id: certificate?.id,
          guestType,
          sharedCardId
        });
      }
    } catch (dbError) {
      console.error('Error saving certificate to database:', dbError);
      // 不影響主流程,繼續回傳結果
    }

    // 回傳成功結果
    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in certificate API:', error);
    return NextResponse.json(
      { 
        error: 'INTERNAL_SERVER_ERROR', 
        message: '伺服器內部錯誤，請稍後再試' 
      } as CertificateApiError,
      { status: 500 }
    );
  }
}

// 只允許 POST 方法
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'METHOD_NOT_ALLOWED', 
      message: '此端點僅支援 POST 請求' 
    } as CertificateApiError,
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'METHOD_NOT_ALLOWED', 
      message: '此端點僅支援 POST 請求' 
    } as CertificateApiError,
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { 
      error: 'METHOD_NOT_ALLOWED', 
      message: '此端點僅支援 POST 請求' 
    } as CertificateApiError,
    { status: 405 }
  );
}