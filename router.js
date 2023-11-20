const express = require('express');
const controllers = require('./controllers');
const router = express.Router();

router.get('/menu', controllers.getMenu);
router.get('/menu/:id', controllers.getMenuItem);
router.get('/combos', controllers.getCombos);
router.get('/principales', controllers.getPrincipales);
router.get('/postres', controllers.getPostres);
router.post('/pedido', controllers.postPedido);
router.get('/pedidos', controllers.getPedidos);
router.post('/usuarios', controllers.register);
router.post('/login', controllers.login);

module.exports = router;