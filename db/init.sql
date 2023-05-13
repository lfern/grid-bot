CREATE TABLE exchanges (
    id SERIAL PRIMARY KEY,
    exchange_name VARCHAR NOT NULL UNIQUE,
)

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    api_key VARCHAR NOT NULL,
    api_secret VARCHAR NOT NULL,
    exchange_id INTEGER NOT NULL,
    exchange_type ENUM('spot', 'futures') DEFAULT 'spot'
    FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
);

CREATE TABLE strategies (
    id SERIAL PRIMARY KEY,
    strategy_type enum('grid') DEFAULT VALUE 'grid',
    symbol VARCHAR NOT NULL,
    order_qty NUMERIC(20, 20),
    account_id INTEGER NOT NULL,
    buy_orders SMALLINT NOT NULL,
    sell_orders SMALLINT NOT NULL,
    active_buys SMALLINT NOT NULL,
    active_sells SMALLINT NOT  NULL,
    step NUMERIC(20, 20),
    -- InitialPosition: posición inicial, en caso de que haya.
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE strategy_instances (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,

    FOREIGN KEY (strategy_id) REFERENCES strategies(id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    strategy_instance_id INTEGER NOT NULL,
    order_side ENUM('buy', 'sell') NOT NULL,
    order_type ENUM('limit', 'market') NOT NULL,
    order_status ENUM('created', 'cancelled', 'closed', 'rejected', 'expired'),
    order_price NUMERIC(20, 20),
    order_amount NUMERIC(20, 20) NOT NULL,
    exchange_order_id VARCHAR NOT NULL,
    exchange_symbol VARCHAR NOT NULL,
    exchange_type ENUM('spot', 'futures') DEFAULT 'spot'

    FOREIGN KEY (strategy_instance_id) REFERENCES strategy_instance(id) 
)

CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    exchange_trade_id VARCHAR NOT NULL,
    trade_price NUMERIC(20, 20) NOT NULL,
    trade_amount NUMERIC(20, 20) NOT NULL,
    fees NUMERIC(20, 20),
    fee_coin VARCHAR,

    FOREIGN KEY (order_id) REFERENCES orders(id)
)

IdStrategy: Identifica la estrategia. Si cambia cualquier parámetro, se genera estrategia nueva.
IdBotInstance: Identifica la instancia del bot dentro de la misma estrategia. Habrá instancia nueva si se relanza el bot sin cambiar ningún parámetro.
Exchange: Identifica el exchange (Bitfinex, BitMEX, etc)
Account: Identifica la cuenta o subcuenta.  Si la principal no tuviera nombre, se identificará como “main”. 
Symbol: Identifica el par de negociación (BTC/USDC, BTC/USDt, etc)
Price: El precio de cada nivel del grid
IdBuyOrder: Identifica la orden de compra para emparejarla con la correspondiente venta
OrderQtyBuy: Cantidad a comprar (unidades)
OrderSizeBuy: Tamaño de la orden para comprobar saldo
IdSellOrder: Identifica la orden de venta para emparejarla con la correspondiente compra
OrderQtySell: Cantidad a vender (unidades)
OrderSizeSell: Tamaño de la orden para comprobar saldo



Datos de mercado:
Position: Posición teórica en ese precio previa a la ejecución de la orden (cointando con la posición inicial)
OrderQty: Cantidad de la orden ya en mercado 
Side: Sentido de la orden ya en mercado
Active: Señala si la orden está activa o no. Si no está activa no está enviada y no consume saldo
IdOrderExchange: Identificador de la orden del exchange. Este campo solo debería estar informado si la orden está activa. 




Lanzamiento y parada del grid
Por “higiene contable”, en cada símbolo y cuenta solo se ejecutará una estrategia. Si el grid lleva una posición inicial, se ejecutará manualmente antes de lanzar el grid. El lanzamiento de un grid consistirá en poblar la tabla anterior. Esto se puede hacer de distintas formas. Para esta fase, lo haremos con los siguientes parámetros:
IdStrategyType: Identifica el tipo de estrategia (inicialmente solo tenemos una, el grid)
IdStrategy: Identifica al grid y su correspondiente conjunto de órdenes y ejecuciones
Exchange: Identifica el exchange
Account: Identifica cuenta o subcuenta
Symbol: Identifica el símbolo
InitialPosition: Posición inicial, en caso de que haya. 
OrderQty: Cantidad de cada orden (la misma para las compras que para las ventas)
BuyOrders: Número total de órdenes de compra
SellOrders: Número total de órdenes de venta
ActiveBuys: Número de compras activas contando desde el precio inicial (las que realmente se lanzarán)
ActiveSells: Número de ventas activas contando desde el precio inicial (las que realmente se lanzarán)
Step:  Distancia en porcentaje entre las órdenes
Cada vez que lancemos o paremos un grid, almacenaremos los datos en una tabla que además de los datos anteriores contendrá estos otros, que se informarán en el momento del lanzamiento:
Event: Start / Stop
Date: Fecha 
Time: Hora 
MaxPrice: Límite superior del grid resultante de aplicar el step y el número de ventas.
MinPrice: Límite inferior del grid resultante de aplicar el step y el número de compras.
Price: Precio en el momento del Evento
Position: Posición en el símbolo en el momento del Evento. En contado sería el saldo en “base”, y en futuros sería