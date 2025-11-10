-- 共享房卡表 (用於管理主住者和同住者)
CREATE TABLE shared_room_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES user_profiles(id) NOT NULL, -- 主住者 (邀請人)
    invitee_id UUID REFERENCES user_profiles(id), -- 同住者 (受邀者，接受後才有值)
    invitee_email TEXT NOT NULL, -- 受邀者 email (發送邀請時使用)
    invitee_name TEXT, -- 受邀者姓名 (選填)
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')) DEFAULT 'pending',
    invitation_token TEXT UNIQUE, -- 邀請連結的唯一識別碼
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- 確保同一個訂單不會重複邀請同一個 email
    UNIQUE(booking_id, invitee_email)
);

-- 房卡邀請記錄表 (完整的邀請歷史，包含屬性快照)
CREATE TABLE room_card_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shared_card_id UUID REFERENCES shared_room_cards(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    property_name TEXT NOT NULL, -- 房源名稱快照
    inviter_email TEXT NOT NULL,
    inviter_name TEXT NOT NULL,
    invitee_email TEXT NOT NULL,
    invitee_name TEXT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    invitation_link TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 啟用 Row Level Security
ALTER TABLE shared_room_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_card_invitations ENABLE ROW LEVEL SECURITY;

-- shared_room_cards 政策
-- 主住者可以查看和管理自己訂單的所有共享房卡
CREATE POLICY "Inviter can manage own shared cards" ON shared_room_cards FOR ALL USING (
    auth.uid() = inviter_id
);

-- 同住者可以查看自己相關的共享房卡
CREATE POLICY "Invitee can view own shared cards" ON shared_room_cards FOR SELECT USING (
    auth.uid() = invitee_id OR 
    (SELECT email FROM user_profiles WHERE id = auth.uid()) = invitee_email
);

-- 同住者可以更新自己的共享房卡狀態 (接受/拒絕)
CREATE POLICY "Invitee can update own card status" ON shared_room_cards FOR UPDATE USING (
    auth.uid() = invitee_id OR 
    (SELECT email FROM user_profiles WHERE id = auth.uid()) = invitee_email
) WITH CHECK (
    status IN ('accepted', 'declined')
);

-- 房東可以查看自己房源的所有共享房卡
CREATE POLICY "Host can view property shared cards" ON shared_room_cards FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bookings b
        JOIN properties p ON b.property_id = p.id
        WHERE b.id = booking_id AND p.host_id = auth.uid()
    )
);

-- room_card_invitations 政策
-- 邀請人可以查看自己發出的邀請
CREATE POLICY "Inviter can view own invitations" ON room_card_invitations FOR SELECT USING (
    inviter_email = (SELECT email FROM user_profiles WHERE id = auth.uid())
);

-- 受邀者可以查看發給自己的邀請
CREATE POLICY "Invitee can view own invitations" ON room_card_invitations FOR SELECT USING (
    invitee_email = (SELECT email FROM user_profiles WHERE id = auth.uid())
);

-- 系統可以插入邀請記錄
CREATE POLICY "System can insert invitations" ON room_card_invitations FOR INSERT WITH CHECK (true);

-- 創建索引以提升性能
CREATE INDEX idx_shared_room_cards_booking_id ON shared_room_cards(booking_id);
CREATE INDEX idx_shared_room_cards_inviter_id ON shared_room_cards(inviter_id);
CREATE INDEX idx_shared_room_cards_invitee_id ON shared_room_cards(invitee_id);
CREATE INDEX idx_shared_room_cards_invitee_email ON shared_room_cards(invitee_email);
CREATE INDEX idx_shared_room_cards_status ON shared_room_cards(status);
CREATE INDEX idx_shared_room_cards_invitation_token ON shared_room_cards(invitation_token);
CREATE INDEX idx_room_card_invitations_shared_card_id ON room_card_invitations(shared_card_id);
CREATE INDEX idx_room_card_invitations_booking_id ON room_card_invitations(booking_id);

-- 創建觸發器以自動更新 updated_at 欄位
CREATE TRIGGER update_shared_room_cards_updated_at BEFORE UPDATE ON shared_room_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 創建觸發器：當狀態變更時自動更新時間戳
CREATE OR REPLACE FUNCTION update_shared_card_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
        NEW.accepted_at = NOW();
    ELSIF NEW.status = 'declined' AND OLD.status != 'declined' THEN
        NEW.declined_at = NOW();
    ELSIF NEW.status = 'revoked' AND OLD.status != 'revoked' THEN
        NEW.revoked_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_shared_card_status_timestamp BEFORE UPDATE ON shared_room_cards
    FOR EACH ROW EXECUTE FUNCTION update_shared_card_status_timestamp();

-- 創建視圖：方便查詢訂單的所有訪客 (主住者 + 同住者)
CREATE OR REPLACE VIEW booking_guests AS
SELECT 
    b.id as booking_id,
    b.property_id,
    b.guest_id as user_id,
    up.name as user_name,
    up.email as user_email,
    'primary' as guest_type,
    b.check_in_date,
    b.check_out_date,
    true as has_access
FROM bookings b
JOIN user_profiles up ON b.guest_id = up.id

UNION ALL

SELECT 
    src.booking_id,
    b.property_id,
    src.invitee_id as user_id,
    COALESCE(up.name, src.invitee_name) as user_name,
    COALESCE(up.email, src.invitee_email) as user_email,
    'co-guest' as guest_type,
    b.check_in_date,
    b.check_out_date,
    CASE WHEN src.status = 'accepted' THEN true ELSE false END as has_access
FROM shared_room_cards src
JOIN bookings b ON src.booking_id = b.id
LEFT JOIN user_profiles up ON src.invitee_id = up.id
WHERE src.status IN ('accepted', 'pending');

-- 為視圖添加註解
COMMENT ON VIEW booking_guests IS '訂單訪客視圖：包含主住者和所有同住者的完整列表';
COMMENT ON TABLE shared_room_cards IS '共享房卡表：管理主住者邀請同住者的資訊和狀態';
COMMENT ON TABLE room_card_invitations IS '房卡邀請記錄表：保存完整的邀請歷史記錄';
