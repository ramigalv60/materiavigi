const connection = require('./db');
const bcrypt = require('bcrypt');

//First we create the functions that will be called in the router.js file

const getMenu = (_, res) => {
    console.log(connection)
    connection.query('SELECT * FROM platos', (err, result) => {
        //If there's an error in the database, we return a 500 error
        if (err) {
            console.error(err);
        }
        //Else we return the menu
        else {
            res.status(200).json(result);
        }
    });
}

const getMenuItem = (req, res) => {
    //First we separate the id from the request
    const { id } = req.params;

    //Then we search for the item in the database
    connection.query('SELECT * FROM platos WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error(err);
        }
        //If the item doesn't exist, we return a 404 error
        if (!result[0]) {
            res.status(404).json({ msg: "No se ha encontrado el item" });
            return;
        }
        //If the item exists, we return it
        res.status(200).json(result[0]);
    });
}

const getCombos = (_, res) => {
    //First we search for all the items in the menu that have the attribute "tipo" as combo
    connection.query('SELECT * FROM platos WHERE tipo = "combo"', (err, result) => {
        //If there's an error we print to the consol
        if (err) {
            console.error(err);
        }
        //Else we return the combos
        res.status(200).json(result);
    });
}

const getPrincipales = (_, res) => {
    //First we search for all the items in the menu that have the attribute "tipo" as principal
    connection.query('SELECT * FROM platos WHERE tipo = "principal"', (err, result) => {
        //If there's an error we print to the consol
        if (err) {
            console.error(err);
        }
        //Else we return the principales
        res.status(200).json(result);
    });
}

const getPostres = (_, res) => {
    //First we search for all the items in the menu that have the attribute "tipo" as postre
    connection.query('SELECT * FROM platos WHERE tipo = "postre"', (err, result) => {
        //If there's an error we print to the consol
        if (err) {
            console.error(err);
        }
        //Else we return the postres
        res.status(200).json(result);
    });
}

async function postPedido(req, res) {
    //First we separate the products from the request
    const { productos } = req.body;
    const userId = req.headers.authorization;

    //If there's no products in the request, we return a 400 error
    if (!productos || !Array.isArray(productos)) {
        return res.status(400).json({ msg: "La solicitud debe incluir productos." });
    }

    //The we search for the products in the database by id
    const [rows] = await connection.promise().query('SELECT * FROM platos');
    const menu = rows.map(row => ({
        id: row.id,
        precio: row.precio
    }));

    let precioFinal = 0;
    let idInexistente = [];

    //Here we made a mirror array to check those products that don't exist in the database
    productos.forEach((producto) => {
        let menuItem = menu.find((item) => item.id === producto.id);

        if (menuItem) {
            precioFinal += menuItem.precio * producto.cantidad;
        } else {
            idInexistente.push(producto.id);
        }
    });

    //If there's products that don't exist in the database, we return a 400 error
    if (idInexistente.length > 0) {
        return res.status(400).json({
            msg: "Los siguientes pedidos no existen en el menú: " + idInexistente.join(", ")
        });
    }
    //If there's no products in the request, we return a 400 error
    let pedidoID;
    connection.query('INSERT INTO pedidos (id_usuario, fecha) VALUES (?, ?)', [userId, new Date()], (err, response) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                msg: "Error al crear el pedido en la base de datos",
            });
        }
    //If there's an error in the databasa, we return a 500 error
        pedidoID = response.insertId;
        for (let i = 0; i < productos.length; i++) {
            connection.query('INSERT INTO pedidos_platos (id_pedido, id_plato, cantidad) VALUES (?, ?, ?)', [pedidoID, productos[i].id, productos[i].cantidad], (err, _) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    //If the order is created, we return the order id
        return res.status(200).json({ id: pedidoID });
    });
}

const getPedidos = (req, res) => {
    
    const id = req.headers.authorization;

    //First we check the contents of the orders(pedidos) and sorrounding tables
    connection.query('SELECT pedidos.*, platos.id AS id_plato, platos.nombre, platos.precio, pedidos_platos.cantidad FROM pedidos JOIN pedidos_platos ON pedidos_platos.id_pedido = pedidos.id JOIN platos ON pedidos_platos.id_plato = platos.id WHERE pedidos.id_usuario = ?', [id], (err, result) => {
        //If there's an error in the databse, we return a 500 error
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: "Error al buscar los pedidos en la base de datos" });
        }
        //If there's no orders, we return a 404 error
        if (!result || result.length === 0) {
            return res.status(404).json({ msg: "No se ha encontrado el pedido" });
        }
        //If there's orders, we return them
        const pedidos = result.reduce((acc, row) => {
            const pedido = acc.find(p => p.id === row.id);
            if (!pedido) {
                acc.push({
                    id: row.id,
                    fecha: row.fecha,
                    estado: row.estado,
                    id_usuario: row.id,
                    platos: [],
                });
            }
            const platos = {
                id: row.id_plato,
                nombre: row.nombre,
                precio: row.precio,
                cantidad: row.cantidad,
            };
            const index = acc.findIndex((p) => p.id === row.id);
            acc[index].platos.push(platos);
            return acc;
        }, []);
        return res.status(200).json(pedidos);
    });
};

const register = (req, res) => {
    const usuario = req.body;

    //First we check if the email already exists in the database
    connection.query('SELECT * FROM usuarios WHERE email = ?', [usuario.email], (err, result) => {
        //if there's an error in the database, we return a 500 error
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: "Error al buscar el correo en la base de datos" });
        }
        //If the email already exists, we return a 400 error
        if (result.length > 0) {
            return res.status(400).json({ msg: "El correo ya esta siendo utilizado" });
        }

        //If the email doesn't exist, we then create the user
        let userId;
        const hashedPassword = bcrypt.hashSync(usuario.password, 10);

        connection.query('INSERT INTO usuarios (nombre, apellido, email, password) VALUES (?, ?, ?, ?)', [usuario.nombre, usuario.apellido, usuario.email, hashedPassword], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ msg: "Error al crear el usuario" });
            }
            //If the user is created, we return the user id
            userId = result.insertId;
            return res.status(200).json({ id: userId });
        });
    });
}

const login = (req, res) => {
    const usuario = req.body;

    //First we check if the email exists in the database
    connection.query('SELECT * FROM usuarios WHERE email = ?', [usuario.email], (err, result) => {
        //if there's an error in the database, we return a 500 error
        if (err) {
            console.error(err);
            return res.status(500).json({ msg: "Error buscando el correo en la base de datos" });
        }
        //If the email doesn't exist, we return a 401 error
        if (result.length == 0) {
            return res.status(401).json({ error: "Usuario o contraseña incorrecto/s" });
        }
        //If the user exists, we now check if the password is correct
        const hashedPassword = result[0].password;
        const passwordCorrect = bcrypt.compareSync(usuario.password, hashedPassword);

        //If the password is incorrect, we return a 400 error
        if (!passwordCorrect) {
            return res.status(400).json({ error: "Usuario o contraseña incorrecto/s" });
        }

        //If the password is correct, we return the user id
        return res.status(200).json({ id: result[0].id });
    });
}

//Final export
module.exports = { getMenu, getCombos, getMenuItem, getPostres, getPrincipales, postPedido, getPedidos, register, login };