# Manual de Despliegue Automatizado - TemikIA CRM

Este manual proporciona instrucciones detalladas paso a paso para configurar tu servidor Unix (Linux / Ubuntu / Debian) y usar el script de automatización `deploy.sh` para actualizar la aplicación en producción con un solo comando.

---

## 🛠️ Requisitos Previos en el Servidor

Antes de ejecutar el script por primera vez, asegúrate de que el servidor tenga instaladas las siguientes herramientas:

### 1. Actualizar el Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Node.js (Versión LTS recomendada)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Instalar Git y PM2
```bash
sudo apt-get install -y git
sudo npm install -y -g pm2
```

---

## 🚀 Configuración del Backend con PM2

**PM2 (Process Manager 2)** se encargará de mantener vivo el proceso de Node.js (`server.js`) indefinidamente, reiniciándolo automáticamente si falla o si el servidor físico se reinicia.

### 1. Iniciar la aplicación por primera vez en PM2
Desde la carpeta raíz del proyecto en el servidor, ejecuta:
```bash
pm2 start server.js --name "temikia-crm"
```

### 2. Configurar Persistencia tras Reinicios de Sistema
Para que la aplicación se active automáticamente al encender el servidor físico, ejecuta:
```bash
pm2 startup
```
*Este comando generará una línea de comando adicional en pantalla. Cópiala y ejecútala con `sudo` para completar la configuración.*

Finalmente, guarda la lista de procesos activos:
```bash
pm2 save
```

---

## 🌐 Configuración del Servidor Web Nginx (Recomendado)

En producción, la mejor práctica es usar **Nginx** para servir los archivos compilados del frontend React de manera súper rápida y actuar como un proxy inverso para el backend de Express.

### 1. Instalar Nginx
```bash
sudo apt install nginx -y
```

### 2. Configurar Bloque de Servidor (Server Block)
Crea un archivo de configuración para la app:
```bash
sudo nano /etc/nginx/sites-available/temikia-crm
```

Pega la siguiente estructura de configuración (reemplazando `tu-dominio.com` por tu IP o dominio real):

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Ruta absoluta a la carpeta de compilación del Frontend React
    root /var/www/TemikiaCRM_test_01/dist;
    index index.html;

    # Carga de recursos estáticos del Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Redirección segura de la API hacia el Backend (Puerto 4001)
    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Activar Configuración y Reiniciar Nginx
```bash
sudo ln -s /etc/nginx/sites-available/temikia-crm /etc/nginx/sites-enabled/
sudo nginx -t # Validar sintaxis
sudo systemctl restart nginx
```

---

## ⚙️ Uso del Script de Despliegue Automático

Una vez configurado el servidor, cada vez que subas cambios a tu repositorio Git, el proceso de actualización se reduce a esto:

### 1. Dar permisos de ejecución al script (Solo la primera vez)
```bash
chmod +x deploy.sh
```

### 2. Ejecutar la actualización
```bash
./deploy.sh
```

### 🔍 ¿Qué hace este script de forma automática?
1. **Valida el Entorno**: Comprueba que Node.js y Git estén en orden.
2. **Descarga desde Git**: Realiza `git pull` de la rama activa de forma automática.
3. **Actualiza Dependencias**: Corre `npm install` instalando paquetes nuevos de desarrollo o producción.
4. **Compila el Frontend**: Ejecuta `npm run build` creando los archivos optimizados de producción dentro de `dist/`.
5. **Reinicia el Backend**: Ejecuta de forma segura `pm2 restart temikia-crm` garantizando cero pérdidas de servicio en el proceso.
