SELECT u.id, u.identifier, array_agg(r.code) as roles
FROM "user" u
LEFT JOIN user_roles_role urr ON urr."userId" = u.id
LEFT JOIN role r ON r.id = urr."roleId"
WHERE u.id IN (
    SELECT "userId" FROM vendor WHERE id IN (42, 43, 56)
) OR u.identifier ILIKE '%superadmin%' OR u.id < 5
GROUP BY u.id, u.identifier;
