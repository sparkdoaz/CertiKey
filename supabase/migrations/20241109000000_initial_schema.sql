-- 用戶檔案表
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    role TEXT CHECK (role IN ('guest', 'host')) DEFAULT 'guest',
    phone TEXT,
    national_id TEXT,
    national_id_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 房源表
CREATE TABLE properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID REFERENCES user_profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    max_guests INTEGER NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    amenities JSONB,
    images JSONB,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 預訂表
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_id UUID REFERENCES user_profiles(id) NOT NULL,
    property_id UUID REFERENCES properties(id) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guests INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 門鎖存取記錄表
CREATE TABLE door_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    property_id UUID REFERENCES properties(id) NOT NULL,
    user_id UUID REFERENCES user_profiles(id) NOT NULL,
    access_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    access_type TEXT CHECK (access_type IN ('unlock', 'lock')) NOT NULL,
    method TEXT CHECK (method IN ('digital_key', 'mobile_app', 'physical_key')) DEFAULT 'digital_key',
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 數位會員卡表
CREATE TABLE membership_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) NOT NULL,
    card_number TEXT UNIQUE NOT NULL,
    card_type TEXT CHECK (card_type IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
    points INTEGER DEFAULT 0,
    tier_benefits JSONB,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 啟用 Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE door_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_cards ENABLE ROW LEVEL SECURITY;

-- 用戶檔案政策
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 房源政策
CREATE POLICY "Anyone can view available properties" ON properties FOR SELECT USING (available = true);
CREATE POLICY "Hosts can manage own properties" ON properties FOR ALL USING (auth.uid() = host_id);

-- 預訂政策
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = guest_id);
CREATE POLICY "Hosts can view property bookings" ON bookings FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM properties WHERE id = property_id)
);
CREATE POLICY "Guests can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = guest_id);
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = guest_id);

-- 門鎖存取記錄政策
CREATE POLICY "Users can view own access logs" ON door_access_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Hosts can view property access logs" ON door_access_logs FOR SELECT USING (
    auth.uid() IN (SELECT host_id FROM properties WHERE id = property_id)
);
CREATE POLICY "System can insert access logs" ON door_access_logs FOR INSERT WITH CHECK (true);

-- 會員卡政策
CREATE POLICY "Users can view own membership cards" ON membership_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own membership cards" ON membership_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own membership cards" ON membership_cards FOR UPDATE USING (auth.uid() = user_id);

-- 創建索引以提升性能
CREATE INDEX idx_properties_host_id ON properties(host_id);
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_door_access_logs_booking_id ON door_access_logs(booking_id);
CREATE INDEX idx_door_access_logs_property_id ON door_access_logs(property_id);
CREATE INDEX idx_door_access_logs_user_id ON door_access_logs(user_id);
CREATE INDEX idx_membership_cards_user_id ON membership_cards(user_id);

-- 創建觸發器以自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_cards_updated_at BEFORE UPDATE ON membership_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();