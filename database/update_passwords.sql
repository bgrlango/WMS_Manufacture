USE cloudtle;

-- Update users with proper password hashes
UPDATE users SET password = '$2b$10$GtIW/8N2ibFUiqbJVsgpieP2iGPQvB79CKQYTTOgBOB16C1bQglt6' WHERE email = 'adm_production01@tle.co.id';
UPDATE users SET password = '$2b$10$vvFnpzcNHjoJlWTwojEjnOEBTkhALcP2trf8STNuqJPJCEQP6Wqpy' WHERE email = 'adm_qc01@tle.co.id';
UPDATE users SET password = '$2b$10$bAADPFv/hX2w9OVPwYMhZOUK72tKdtW2eHRHKBfRw0Ij5hFA9BD3e' WHERE email = 'adm_warehouse01@tle.co.id';

-- Verify updates
SELECT id, email, SUBSTRING(password, 1, 30) as password_hash, role FROM users;
