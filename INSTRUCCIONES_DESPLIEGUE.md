# Manual de Despliegue y Convivencia en Servidor - Temikia CRM & n8n

Este manual detalla la arquitectura de producción y los pasos para el despliegue del **CRM de Temikia** y **n8n** conviviendo de manera segura e inteligente en el mismo servidor Unix, utilizando **Nginx** como Proxy Inverso único y **PM2 / Docker** como gestores de procesos.

---

## 🏗️ Resumen de la Arquitectura

Para lograr una convivencia óptima y segura, el servidor está configurado bajo la siguiente arquitectura unificada:

1. **CRM de Temikia** (Frontend y Backend unificados):
   - El backend Express (`server.js`) funciona en modo producción (`NODE_ENV=production`).
   - Sirve directamente los archivos compilados de React/Vite desde la carpeta local `./dist` para todas las rutas no-API (`/*`), y atiende las llamadas a `/api/*`.
   - Se ejecuta localmente en el puerto `127.0.0.1:4001` mediante el proceso **PM2** llamado `temikia-crm`.
2. **n8n Instance**:
   - Corre dentro de un contenedor Docker en el puerto interno `5678` (expuesto como servicio `n8n_n8n`).
   - Protegido por el cortafuegos UFW (`sudo ufw deny 5678/tcp`), impidiendo conexiones directas sin HTTPS.
3. **Nginx (Único Punto de Entrada)**:
   - Actúa como Proxy Inverso seguro, escuchando en los puertos estándar `80` (HTTP) y `443` (HTTPS / HTTP2).
   - Administra los certificados SSL de Let's Encrypt de forma automática para ambos dominios:
     * **`crm.temikia.com`** -> Redirige al puerto interno del CRM (`127.0.0.1:4001`).
     * **`n8n.temikia.com`** -> Redirige al puerto interno de n8n (`127.0.0.1:5678`), soportando WebSockets mediante el mapeo de conexiones.

---

## ⚡ Solución al Conflicto de Puertos (Docker/Traefik vs Nginx)

Si el servidor tiene instalado un gestor como *Easypanel*, este levanta por defecto un contenedor de **Traefik** que se apropia de los puertos `80` y `443`, impidiendo que Nginx pueda arrancar.

### Comando para liberar los puertos 80/443:
Para apagar Traefik y permitir que Nginx tome el control total del tráfico web del servidor, ejecuta:
```bash
docker service scale easypanel-traefik=0
```
*(Esto escala el contenedor de Traefik a 0 instancias, liberando inmediatamente los puertos web).*

---

## 🛡️ Configuración de VirtualHosts en Nginx

Los archivos de configuración en `/etc/nginx/sites-available/` deben configurarse de la siguiente manera:

### 1. Configuración del CRM (`/etc/nginx/sites-available/temikia_crm`)
Este bloque redirige todo el tráfico HTTP a HTTPS y delega el servicio unificado (Vite + Express) al puerto `4001`:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name crm.temikia.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name crm.temikia.com;

    ssl_certificate /etc/letsencrypt/live/crm.temikia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.temikia.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Encabezado CSP seguro configurado en conjunto con Helmet
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 2. Configuración de n8n (`/etc/nginx/sites-available/n8n.temikia.com`)
Requiere soporte para WebSockets (`Upgrade` / `Connection`) para el editor en tiempo real:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name n8n.temikia.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name n8n.temikia.com;

    ssl_certificate /etc/letsencrypt/live/n8n.temikia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/n8n.temikia.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

*Nota: Asegúrate de incluir el mapeo de Websockets en `/etc/nginx/conf.d/websocket_upgrade.conf`:*
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

---

## ⚙️ Uso del Script de Despliegue Automático (`deploy.sh`)

El script de actualización automática `deploy.sh` en el directorio `/root/temikiaCRM` se encarga de compilar el frontend localmente e informar al proceso de PM2.

### Ejecución
Cada vez que subas cambios al repositorio Git, ejecuta esto en la terminal del servidor:
```bash
./deploy.sh
```

### 🔍 Flujo automatizado:
1. **Pull Git**: Obtiene los últimos cambios de la rama actual de forma automática.
2. **Dependencias**: Instala actualizaciones con `npm install`.
3. **Build Frontend**: Compila la app React creando la carpeta `./dist`.
4. **Reinicio de Backend**: Reinicia de manera segura el proceso `temikia-crm` en PM2 aplicando las nuevas variables de entorno (`pm2 restart temikia-crm --update-env`).
5. **Persistencia**: Guarda la lista de PM2 en el arranque del sistema (`pm2 save`).

---

## 🔍 Comandos Útiles de Monitoreo en el Servidor

### Estado de los puertos y servicios Nginx:
```bash
sudo ss -ltnp | grep -E ':80|:443|:4001|:5678'
```

### Monitoreo en tiempo real del CRM:
```bash
pm2 status                  # Ver estado de los procesos
pm2 logs temikia-crm        # Ver logs del backend en tiempo real
```

### Certificados SSL Let's Encrypt:
```bash
sudo certbot certificates   # Listar certificados activos
```
