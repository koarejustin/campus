router.get('/verifier-membre', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 1 FROM gestion_ape.bureau_direction b
            JOIN gestion_ape.profils_parents pp ON b.id_parent = pp.id_parent
            WHERE pp.id_user = $1
        `, [req.user.id]);
        res.json({ estMembre: result.rows.length > 0 });
    } catch (err) { res.json({ estMembre: false }); }
});