# NominaLocal Web - preparación de despliegue

Proyecto Supabase NUEVO: NominaLocal-Web (khllytnbkmilhxqsauvb).
No modificar NominaLocal-Produccion ni la base del Mac.

## Pendiente antes de publicar
1. Aplicar y probar en orden las 55 migraciones de supabase/migrations sobre la base nueva.
2. Auditar las políticas RLS, funciones SECURITY DEFINER y permisos antes de datos reales.
3. Configurar la autenticación, cerrar el registro público y aprovisionar el MASTER por canal administrativo seguro.
4. Desplegar las dos Edge Functions con sus permisos correctos.
5. Configurar en Vercel VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con clave PUBLICABLE. Nunca incluir service_role en frontend.
6. Construir con pnpm run build:prod y asociar nomina.aurixbullionsas.com.

Este paquete es preparación de código, no evidencia de despliegue o migraciones aplicadas.
