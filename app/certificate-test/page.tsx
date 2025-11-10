'use client';

import { useState } from 'react';
import { CertificateRequest, CertificateResponse, CertificateApiError } from '../../types/digital-certificate';

export default function CertificateTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vcUid: '00000000_certikey',
    issuanceDate: '20251110',
    expiredDate: '20251210',
    id_number: 'A123456789',
    name: '王小明',
    member_serial: 'MEMB00123',
    checkin_time: '20251110T1500',
    checkout_time: '20251112T1100',
    email: 'service@example.com',
    room_info: 'ORDER20251110A01',
    room_num: 'A101'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestData: CertificateRequest = {
        vcUid: formData.vcUid,
        issuanceDate: formData.issuanceDate,
        expiredDate: formData.expiredDate,
        fields: [
          { ename: 'id_number', content: formData.id_number },
          { ename: 'name', content: formData.name },
          { ename: 'member_serial', content: formData.member_serial },
          { ename: 'checkin_time', content: formData.checkin_time },
          { ename: 'checkout_time', content: formData.checkout_time },
          { ename: 'email', content: formData.email },
          { ename: 'room_info', content: formData.room_info },
          { ename: 'room_num', content: formData.room_num }
        ]
      };

      const response = await fetch('/api/digital-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData: CertificateApiError = await response.json();
        throw new Error(errorData.message || '請求失敗');
      }

      const responseData: CertificateResponse = await response.json();
      setResult(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">數位憑證 API 測試</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              憑證 UID
            </label>
            <input
              type="text"
              name="vcUid"
              value={formData.vcUid}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              發證日期 (YYYYMMDD)
            </label>
            <input
              type="text"
              name="issuanceDate"
              value={formData.issuanceDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="\d{8}"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              到期日期 (YYYYMMDD)
            </label>
            <input
              type="text"
              name="expiredDate"
              value={formData.expiredDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="\d{8}"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              身分證字號
            </label>
            <input
              type="text"
              name="id_number"
              value={formData.id_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              會員編號
            </label>
            <input
              type="text"
              name="member_serial"
              value={formData.member_serial}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              進房時間 (YYYYMMDDTHHMM)
            </label>
            <input
              type="text"
              name="checkin_time"
              value={formData.checkin_time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              退房時間 (YYYYMMDDTHHMM)
            </label>
            <input
              type="text"
              name="checkout_time"
              value={formData.checkout_time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電子信箱
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              訂單編號
            </label>
            <input
              type="text"
              name="room_info"
              value={formData.room_info}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              房門號
            </label>
            <input
              type="text"
              name="room_num"
              value={formData.room_num}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? '處理中...' : '申請數位憑證'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-800 font-medium mb-2">錯誤</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-green-800 font-medium mb-2">申請成功</h3>
            <p className="text-green-700">交易 ID: {result.transactionId}</p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="font-medium mb-2">QR Code</h3>
            {result.qrCode && (
              <img 
                src={result.qrCode} 
                alt="QR Code" 
                className="max-w-xs border border-gray-300 rounded"
              />
            )}
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="font-medium mb-2">Deep Link</h3>
            <a 
              href={result.deepLink} 
              className="text-blue-600 hover:text-blue-800 break-all text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {result.deepLink}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}