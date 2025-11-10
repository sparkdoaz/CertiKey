-- 為 bookings 表添加房號欄位
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS room_number TEXT;

-- 為 properties 表添加房號相關欄位（如果房源有多個房間）
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS room_numbers JSONB;

-- 為現有房源生成預設房間號碼（簡單格式：R001, R002...）
WITH numbered_properties AS (
  SELECT 
    id,
    'R' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0') AS room_number
  FROM properties
  WHERE room_numbers IS NULL
)
UPDATE properties 
SET room_numbers = jsonb_build_array(numbered_properties.room_number)
FROM numbered_properties
WHERE properties.id = numbered_properties.id;

-- 為現有訂單生成預設房號（對齊房源的第一個房間號碼）
UPDATE bookings b
SET room_number = (
  SELECT (p.room_numbers->0)::TEXT  -- 轉換 JSONB 為 TEXT
  FROM properties p
  WHERE p.id = b.property_id
)
WHERE b.room_number IS NULL
  AND EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = b.property_id 
    AND p.room_numbers IS NOT NULL
  );

-- 添加索引以提升查詢性能（如果索引不存在）
CREATE INDEX IF NOT EXISTS idx_bookings_room_number ON bookings(room_number);

-- 添加複合索引以優化房間可用性查詢
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates ON bookings(property_id, check_in_date, check_out_date);

-- 添加註解說明欄位用途
COMMENT ON COLUMN bookings.room_number IS '分配給此預訂的房間號碼（英文數字組合）';
COMMENT ON COLUMN properties.room_numbers IS '房源可用的房間號碼列表（JSON 格式，適用於有多個房間的房源）';
