-- 添加 email 欄位到 user_profiles 表
ALTER TABLE user_profiles ADD COLUMN email TEXT;

-- 為現有用戶更新 email（從 auth.users 表同步）
-- 注意：這個查詢需要在有現有資料時才執行
DO $$
BEGIN
    -- 檢查是否有現有的 user_profiles 記錄
    IF EXISTS (SELECT 1 FROM user_profiles LIMIT 1) THEN
        -- 同步現有用戶的 email
        UPDATE user_profiles 
        SET email = auth_users.email
        FROM auth.users auth_users
        WHERE auth_users.id = user_profiles.id;
    END IF;
END
$$;

-- 設置 email 為 NOT NULL（在更新現有資料後）
ALTER TABLE user_profiles ALTER COLUMN email SET NOT NULL;

-- 添加 unique 約束
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);