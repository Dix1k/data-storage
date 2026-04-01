SELECT
    d.name        AS Кафедра,
    t.full_name   AS ФИО_преподавателя,
    t.position    AS Должность
FROM 
    department AS d
    LEFT JOIN teacher AS t 
        ON t.department_id = d.id
ORDER BY 
    d.name, t.full_name;
