-- 添加 short_id 參數支持到房間分配函數

CREATE OR REPLACE FUNCTION create_booking_with_room_assignment(
  p_guest_id UUID,
  p_property_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_guests INTEGER,
  p_total_price DECIMAL(10,2),
  p_status TEXT DEFAULT 'confirmed',
  p_short_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_property_record RECORD;
  v_available_room TEXT;
  v_booking_id UUID;
  v_booking_data JSONB;
BEGIN
  -- 開始交易
  BEGIN
    -- 1. 檢查房源是否存在並獲取房號配置
    SELECT * INTO v_property_record
    FROM properties
    WHERE id = p_property_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION '房源不存在';
    END IF;

    -- 2. 檢查房源是否有房號配置
    IF v_property_record.room_numbers IS NULL OR jsonb_array_length(v_property_record.room_numbers) = 0 THEN
      RAISE EXCEPTION '房源資料不完整：缺少房號配置，請聯繫房東完善房源資訊';
    END IF;

    -- 3. 找出指定日期範圍內已被佔用的房號
    CREATE TEMP TABLE temp_occupied_rooms AS
    SELECT DISTINCT room_number
    FROM bookings
    WHERE property_id = p_property_id
      AND status != 'cancelled'
      AND room_number IS NOT NULL
      AND (
        (check_in_date < p_check_out_date AND check_out_date > p_check_in_date)
      );

    -- 4. 從房源房號中找出可用的房號
    SELECT room_number INTO v_available_room
    FROM (
      SELECT jsonb_array_elements_text(v_property_record.room_numbers) as room_number
    ) available_rooms
    WHERE room_number NOT IN (SELECT room_number FROM temp_occupied_rooms)
    LIMIT 1;

    -- 5. 如果沒有可用房間，拋出錯誤
    IF v_available_room IS NULL THEN
      DROP TABLE temp_occupied_rooms;
      RAISE EXCEPTION '無可用房間：該時段已無可用房間，請選擇其他日期或聯繫房東';
    END IF;

    -- 6. 創建訂單
    INSERT INTO bookings (
      guest_id,
      property_id,
      check_in_date,
      check_out_date,
      guests,
      total_price,
      status,
      room_number,
      short_id
    ) VALUES (
      p_guest_id,
      p_property_id,
      p_check_in_date,
      p_check_out_date,
      p_guests,
      p_total_price,
      p_status,
      v_available_room,
      COALESCE(p_short_id, UPPER(SUBSTRING(MD5(gen_random_uuid()::text), 1, 12)))
    )
    RETURNING id INTO v_booking_id;

    -- 7. 獲取完整的訂單資料（包含關聯資料）
    SELECT jsonb_build_object(
      'id', b.id,
      'guest_id', b.guest_id,
      'property_id', b.property_id,
      'check_in_date', b.check_in_date,
      'check_out_date', b.check_out_date,
      'guests', b.guests,
      'total_price', b.total_price,
      'status', b.status,
      'room_number', b.room_number,
      'short_id', b.short_id,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'property', jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'images', p.images
      ),
      'guest', jsonb_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email
      )
    ) INTO v_booking_data
    FROM bookings b
    LEFT JOIN properties p ON b.property_id = p.id
    LEFT JOIN user_profiles u ON b.guest_id = u.id
    WHERE b.id = v_booking_id;

    -- 清理臨時表
    DROP TABLE temp_occupied_rooms;

    -- 返回結果
    RETURN v_booking_data;

  EXCEPTION
    WHEN OTHERS THEN
      -- 發生錯誤時清理臨時表（如果存在）
      BEGIN
        DROP TABLE IF EXISTS temp_occupied_rooms;
      EXCEPTION
        WHEN OTHERS THEN
          -- 忽略清理錯誤
          NULL;
      END;

      -- 重新拋出原始錯誤
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;