ALTER TABLE clothing_items DROP CONSTRAINT clothing_items_user_id_fkey;
ALTER TABLE outfit_plans DROP CONSTRAINT outfit_plans_user_id_fkey;
ALTER TABLE outfit_history DROP CONSTRAINT outfit_history_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT profiles_user_id_fkey;

UPDATE clothing_items SET user_id = '00000000-0000-0000-0000-000000000000';
UPDATE outfit_plans SET user_id = '00000000-0000-0000-0000-000000000000';
UPDATE outfit_history SET user_id = '00000000-0000-0000-0000-000000000000';