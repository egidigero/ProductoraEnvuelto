/**
 * Script para generar hash de contraseñas para operadores
 * 
 * Uso:
 *   node scripts/generate-password-hash.js contraseña
 * 
 * Ejemplo:
 *   node scripts/generate-password-hash.js admin123
 */

const bcrypt = require('bcryptjs')

const password = process.argv[2]

if (!password) {
  console.error('❌ Error: Debes proporcionar una contraseña')
  console.log('\nUso: node scripts/generate-password-hash.js <contraseña>')
  console.log('Ejemplo: node scripts/generate-password-hash.js admin123\n')
  process.exit(1)
}

const saltRounds = 10

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('❌ Error generando hash:', err)
    process.exit(1)
  }

  console.log('\n✅ Hash generado exitosamente:')
  console.log('━'.repeat(80))
  console.log(hash)
  console.log('━'.repeat(80))
  console.log('\nUsa este hash en el INSERT SQL:')
  console.log(`
INSERT INTO public.operators (username, password_hash, name, email, is_active)
VALUES (
  'username_aqui',
  '${hash}',
  'Nombre Completo',
  'email@example.com',
  true
);
`)
})
