-- Ручное создание public-профиля для пользователя из Authentication → Users
-- Замените UUID и username на свои (ID скопируйте из Auth → Users → User UID)

-- id из Authentication (пример):
-- e80c60c8-67a7-48e1-bc58-594a2d69ae24

INSERT INTO public.users (id, username, display_name)
VALUES (
  'e80c60c8-67a7-48e1-bc58-594a2d69ae24',
  'nikita123456789000',
  'Nikita'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profile_customization (user_id)
VALUES ('e80c60c8-67a7-48e1-bc58-594a2d69ae24')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_status (user_id)
VALUES ('e80c60c8-67a7-48e1-bc58-594a2d69ae24')
ON CONFLICT (user_id) DO NOTHING;
