-- 新增 vc_title 欄位到 properties 表
-- 用於數位憑證的房源標題 (只能包含英文、數字和底線)
ALTER TABLE properties
ADD COLUMN vc_title TEXT;

-- 加上註解說明
COMMENT ON COLUMN properties.vc_title IS '數位憑證專用的房源標題,只能包含英文、數字和底線,用於政府 VC API';