-- Estructura de base de datos para el sistema de tickets
-- Ejecutar en tu base de datos PostgreSQL/MySQL

CREATE TABLE ticket_purchases (
    id VARCHAR(255) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dni VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    ticket_type ENUM('general', 'vip', 'early') NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    mercado_pago_id VARCHAR(255),
    qr_code VARCHAR(255),
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX idx_dni ON ticket_purchases(dni);
CREATE INDEX idx_email ON ticket_purchases(email);
CREATE INDEX idx_payment_status ON ticket_purchases(payment_status);
CREATE INDEX idx_ticket_type ON ticket_purchases(ticket_type);
