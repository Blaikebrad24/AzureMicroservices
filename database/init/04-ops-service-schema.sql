-- Ops service schema (messaging + calendar)
-- Connects to ops_service_db

\c ops_service_db;

-- Messaging: channels
CREATE TABLE IF NOT EXISTS channel (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color       VARCHAR(7) DEFAULT '#3b82f6',
    icon        VARCHAR(50) DEFAULT 'hash',
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messaging: messages
CREATE TABLE IF NOT EXISTS message (
    id          BIGSERIAL PRIMARY KEY,
    channel_id  BIGINT NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
    author      VARCHAR(100) NOT NULL,
    content     TEXT NOT NULL,
    priority    VARCHAR(20) DEFAULT 'NORMAL',
    pinned      BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_channel_id ON message(channel_id);
CREATE INDEX idx_message_created_at ON message(created_at);
CREATE INDEX idx_message_author ON message(author);

-- Calendar: team members
CREATE TABLE IF NOT EXISTS team_member (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    username    VARCHAR(100),
    role        VARCHAR(100),
    color       VARCHAR(7) DEFAULT '#3b82f6',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar: shifts
CREATE TABLE IF NOT EXISTS shift (
    id              BIGSERIAL PRIMARY KEY,
    team_member_id  BIGINT NOT NULL REFERENCES team_member(id) ON DELETE CASCADE,
    title           VARCHAR(255),
    shift_date      DATE NOT NULL,
    start_time      TIME,
    end_time        TIME,
    shift_type      VARCHAR(20) NOT NULL DEFAULT 'DAY',
    notes           TEXT,
    created_by      VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shift_team_member_id ON shift(team_member_id);
CREATE INDEX idx_shift_date ON shift(shift_date);
CREATE INDEX idx_shift_date_range ON shift(shift_date, team_member_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Channels
INSERT INTO channel (name, description, color, icon, sort_order) VALUES
    ('General', 'General shift handoff updates and announcements', '#3b82f6', 'hash', 1),
    ('Infrastructure', 'Hardware, power, cooling, and facility updates', '#10b981', 'server', 2),
    ('Network', 'Network equipment, connectivity, and firewall changes', '#f59e0b', 'wifi', 3),
    ('Urgent', 'Critical alerts and escalations requiring immediate attention', '#ef4444', 'alert-triangle', 4);

-- Team Members
INSERT INTO team_member (name, username, role, color) VALUES
    ('Alice Chen', 'alice.chen', 'Senior Technician', '#3b82f6'),
    ('Bob Martinez', 'bob.martinez', 'Network Engineer', '#10b981'),
    ('Carol Johnson', 'carol.johnson', 'Shift Lead', '#f59e0b'),
    ('Dave Wilson', 'dave.wilson', 'Junior Technician', '#8b5cf6'),
    ('Eve Roberts', 'eve.roberts', 'Systems Admin', '#ef4444');

-- Sample Messages
INSERT INTO message (channel_id, author, content, priority, created_at) VALUES
    (1, 'carol.johnson', 'Day shift handoff: All systems nominal. Rack C3 temperature normalized after CRAC unit adjustment at 14:30.', 'NORMAL', NOW() - INTERVAL '4 hours'),
    (1, 'bob.martinez', 'Swing shift starting. Acknowledged the CRAC adjustment — will monitor temps in C3 overnight.', 'NORMAL', NOW() - INTERVAL '3 hours 45 minutes'),
    (2, 'alice.chen', 'Replaced UPS battery module in Rack C3. Old unit was showing 78% capacity. New module tested at 100%.', 'NORMAL', NOW() - INTERVAL '6 hours'),
    (2, 'dave.wilson', 'PDU firmware update completed on racks A1-A4. No power interruptions during the rolling update.', 'NORMAL', NOW() - INTERVAL '2 hours'),
    (3, 'bob.martinez', 'Network switch firmware update scheduled for tonight 02:00-03:00. Redundant path verified — no expected downtime.', 'HIGH', NOW() - INTERVAL '5 hours'),
    (3, 'bob.martinez', 'Core router BGP session flapped briefly at 11:22. Auto-recovered in 8 seconds. Investigating root cause.', 'NORMAL', NOW() - INTERVAL '1 hour'),
    (4, 'carol.johnson', 'HVAC unit #2 showing intermittent fault code. Facilities team notified. Backup cooling engaged.', 'URGENT', NOW() - INTERVAL '30 minutes'),
    (4, 'alice.chen', 'Generator test completed successfully. 15-minute load bank test passed all parameters.', 'NORMAL', NOW() - INTERVAL '8 hours'),
    (1, 'eve.roberts', 'Patching window for Linux servers moved to Thursday 01:00-04:00. Updated the change calendar.', 'NORMAL', NOW() - INTERVAL '1 hour 30 minutes'),
    (2, 'carol.johnson', 'New fiber run completed between MDF and Rack D7. 10Gbps link tested and active.', 'NORMAL', NOW() - INTERVAL '7 hours');

-- Sample Shifts (current week starting Monday)
-- We use date_trunc to get current week's Monday
DO $$
DECLARE
    week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
BEGIN
    -- Alice Chen (ID 1): Day shifts Mon-Wed, Swing Thu, Day Fri
    INSERT INTO shift (team_member_id, title, shift_date, start_time, end_time, shift_type, created_by) VALUES
        (1, 'Day Shift - NOC', week_start, '06:00', '14:00', 'DAY', 'admin-user'),
        (1, 'Day Shift - NOC', week_start + 1, '06:00', '14:00', 'DAY', 'admin-user'),
        (1, 'Day Shift - NOC', week_start + 2, '06:00', '14:00', 'DAY', 'admin-user'),
        (1, 'Swing Shift', week_start + 3, '14:00', '22:00', 'SWING', 'admin-user'),
        (1, 'Day Shift - NOC', week_start + 4, '06:00', '14:00', 'DAY', 'admin-user');

    -- Bob Martinez (ID 2): Night shifts Mon-Tue, Off Wed, Day Thu-Fri
    INSERT INTO shift (team_member_id, title, shift_date, start_time, end_time, shift_type, created_by) VALUES
        (2, 'Night Shift', week_start, '22:00', '06:00', 'NIGHT', 'admin-user'),
        (2, 'Night Shift', week_start + 1, '22:00', '06:00', 'NIGHT', 'admin-user'),
        (2, 'Off', week_start + 2, NULL, NULL, 'OFF', 'admin-user'),
        (2, 'Day Shift - Network', week_start + 3, '06:00', '14:00', 'DAY', 'admin-user'),
        (2, 'Day Shift - Network', week_start + 4, '06:00', '14:00', 'DAY', 'admin-user');

    -- Carol Johnson (ID 3): Day Mon, Swing Tue-Wed, On-Call Thu, Day Fri
    INSERT INTO shift (team_member_id, title, shift_date, start_time, end_time, shift_type, created_by) VALUES
        (3, 'Day Shift - Lead', week_start, '06:00', '14:00', 'DAY', 'admin-user'),
        (3, 'Swing Shift - Lead', week_start + 1, '14:00', '22:00', 'SWING', 'admin-user'),
        (3, 'Swing Shift - Lead', week_start + 2, '14:00', '22:00', 'SWING', 'admin-user'),
        (3, 'On-Call', week_start + 3, '00:00', '23:59', 'ONCALL', 'admin-user'),
        (3, 'Day Shift - Lead', week_start + 4, '06:00', '14:00', 'DAY', 'admin-user');

    -- Dave Wilson (ID 4): Swing Mon-Wed, Off Thu-Fri, Day Sat
    INSERT INTO shift (team_member_id, title, shift_date, start_time, end_time, shift_type, created_by) VALUES
        (4, 'Swing Shift', week_start, '14:00', '22:00', 'SWING', 'admin-user'),
        (4, 'Swing Shift', week_start + 1, '14:00', '22:00', 'SWING', 'admin-user'),
        (4, 'Swing Shift', week_start + 2, '14:00', '22:00', 'SWING', 'admin-user'),
        (4, 'Off', week_start + 3, NULL, NULL, 'OFF', 'admin-user'),
        (4, 'Off', week_start + 4, NULL, NULL, 'OFF', 'admin-user'),
        (4, 'Day Shift', week_start + 5, '06:00', '14:00', 'DAY', 'admin-user');

    -- Eve Roberts (ID 5): Night Mon-Wed, Off Thu, Night Fri-Sat
    INSERT INTO shift (team_member_id, title, shift_date, start_time, end_time, shift_type, created_by) VALUES
        (5, 'Night Shift - Sysadmin', week_start, '22:00', '06:00', 'NIGHT', 'admin-user'),
        (5, 'Night Shift - Sysadmin', week_start + 1, '22:00', '06:00', 'NIGHT', 'admin-user'),
        (5, 'Night Shift - Sysadmin', week_start + 2, '22:00', '06:00', 'NIGHT', 'admin-user'),
        (5, 'Off', week_start + 3, NULL, NULL, 'OFF', 'admin-user'),
        (5, 'Night Shift - Sysadmin', week_start + 4, '22:00', '06:00', 'NIGHT', 'admin-user'),
        (5, 'Night Shift - Sysadmin', week_start + 5, '22:00', '06:00', 'NIGHT', 'admin-user');
END $$;
