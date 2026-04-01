SELECT 
    st.full_name    AS ФИО, 
    st.student_id   AS Номер_зачётки,
    g.name          AS Группа,
    g.course        AS Курс
FROM 
    student AS st
    INNER JOIN edu_group AS g 
       ON st.group_id = g.id
WHERE 
    st.status = N'Обучается'
ORDER BY 
    g.name, st.full_name;
