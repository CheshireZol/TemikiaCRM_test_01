#!/bin/bash

# ==============================================================================
# SCRIPT DE DESPLIEGUE AUTOMATIZADO - TEMIKIA CRM
# ==============================================================================
# Diseñado para servidores Unix (Linux / Ubuntu / Debian)
# Este script automatiza la descarga de Git, instalación de dependencias,
# compilación de la interfaz React con Vite y el reinicio seguro del servidor backend.
# ==============================================================================

# ==============================================================================
# CONFIGURACIÓN DE RUTAS
# ==============================================================================
# Define la ruta de tu carpeta web pública (Nginx/Apache) si deseas que el script
# copie automáticamente los archivos compilados en 'dist/' a esa ubicación.
# Ejemplo: "/var/www/temikiaCRM" o "/var/www/html". Déjala vacía si Nginx sirve
# directamente desde la carpeta del proyecto en '/root/temikiaCRM/dist'.
WWW_DIR="/var/www/temikiaCRM"

# Colores de Consola ANSI para salidas elegantes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # Sin Color

echo -e "${CYAN}${BOLD}========================================================"
echo -e "   INICIANDO DESPLIEGUE Y ACTUALIZACIÓN - TEMIKIA CRM"
echo -e "========================================================${NC}\n"

# 1. VALIDACIÓN DE ENTORNO
echo -e "${BLUE}[1/5] Verificando entorno de ejecución...${NC}"

# Verificar si estamos en un repositorio de Git
if [ ! -d ".git" ]; then
    echo -e "${RED}${BOLD}CRÍTICO: No se detectó un repositorio Git en esta carpeta.${NC}"
    echo -e "Asegúrate de ejecutar este script desde la raíz del proyecto."
    exit 1
fi

# Verificar si node y npm están disponibles
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo -e "${RED}${BOLD}CRÍTICO: Node.js o npm no se encuentran instalados o accesibles en el PATH.${NC}"
    exit 1
fi

echo -e "  - Node.js versión: $(node -v)"
echo -e "  - npm versión:     $(npm -v)"
echo -e "${GREEN}✔ Entorno correcto verificado.${NC}\n"

# 2. DESCARGAR ÚLTIMOS CAMBIOS DESDE GIT
echo -e "${BLUE}[2/5] Descargando últimos cambios desde Git...${NC}"
# Obtener el nombre de la rama actual para asegurar el pull correcto
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "  - Rama activa detectada: ${BOLD}${CURRENT_BRANCH}${NC}"

# Ejecutar git pull
if git pull origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}✔ Cambios de Git descargados con éxito.${NC}\n"
else
    echo -e "${YELLOW}ADVERTENCIA: Falló 'git pull'. Intentando continuar con el despliegue local...${NC}\n"
fi

# 3. INSTALACIÓN DE DEPENDENCIAS
echo -e "${BLUE}[3/5] Instalando dependencias de Node.js...${NC}"
if npm install; then
    echo -e "${GREEN}✔ Dependencias instaladas y actualizadas correctamente.${NC}\n"
else
    echo -e "${RED}${BOLD}CRÍTICO: Error durante la ejecución de 'npm install'. Despliegue cancelado.${NC}"
    exit 1
fi

# 4. COMPILACIÓN DE LA INTERFAZ (FRONTEND VITE/REACT)
echo -e "${BLUE}[4/5] Compilando interfaz frontend (React/Vite)...${NC}"
if npm run build; then
    echo -e "${GREEN}✔ Compilación completada con éxito. Recursos estáticos creados en 'dist/'.${NC}"
    
    # Copiar archivos a la carpeta web pública si está configurada
    if [ -n "$WWW_DIR" ]; then
        echo -e "  - Copiando archivos compilados a la carpeta web pública: ${BOLD}${WWW_DIR}${NC}..."
        # Crear la carpeta de destino de forma segura
        mkdir -p "$WWW_DIR"
        
        # Limpiar contenido anterior de forma segura
        rm -rf "$WWW_DIR"/*
        
        # Copiar los nuevos archivos compilados
        if cp -r dist/* "$WWW_DIR"/; then
            echo -e "${GREEN}✔ Archivos copiados correctamente a la carpeta de producción.${NC}\n"
        else
            echo -e "${YELLOW}ADVERTENCIA: No se pudieron copiar los archivos a ${WWW_DIR}. Verifica los permisos de escritura.${NC}\n"
        fi
    else
        echo -e "\n"
    fi
else
    echo -e "${RED}${BOLD}CRÍTICO: Falló la compilación de Vite ('npm run build'). Despliegue cancelado.${NC}"
    exit 1
fi

# 5. REINICIO DE SERVICIOS
echo -e "${BLUE}[5/5] Reiniciando servicios del servidor...${NC}"

# Verificar si PM2 está instalado y activo en el sistema
if command -v pm2 &> /dev/null; then
    echo -e "  - PM2 detectado. Verificando procesos activos..."
    
    # Comprobamos qué proceso ya está registrado en PM2 (temikia-backend, temikia-crm o server)
    if pm2 list | grep -q "temikia-backend"; then
        echo -e "  - Reiniciando proceso existente '${BOLD}temikia-backend${NC}'..."
        pm2 restart "temikia-backend"
    elif pm2 list | grep -q "temikia-crm"; then
        echo -e "  - Reiniciando proceso existente '${BOLD}temikia-crm${NC}'..."
        pm2 restart "temikia-crm"
    elif pm2 list | grep -q "server"; then
        echo -e "  - Reiniciando proceso existente '${BOLD}server${NC}'..."
        pm2 restart "server"
    else
        echo -e "  - Proceso no registrado en PM2. Iniciando proceso nuevo como '${BOLD}temikia-backend${NC}'..."
        pm2 start server.js --name "temikia-backend"
    fi
    
    # Guardar la lista actual de PM2 para persistencia tras reinicios del sistema
    pm2 save
    echo -e "${GREEN}✔ Servicios reiniciados y persistidos en PM2 con éxito.${NC}\n"
else
    # Si no hay PM2, dar instrucciones alternativas o intentar reiniciar si hay un script de inicio configurado
    echo -e "${YELLOW}PM2 no se encuentra instalado en este servidor.${NC}"
    echo -e "El backend debe ser iniciado manualmente o mediante tu gestor de procesos (systemd/systemctl)."
    echo -e "Puedes iniciarlo manualmente en segundo plano con:"
    echo -e "  ${BOLD}nohup node server.js > server.log 2>&1 &${NC}\n"
fi

echo -e "${GREEN}${BOLD}========================================================"
echo -e "      DESPLIEGUE FINALIZADO EXITOSAMENTE"
echo -e "      TemikIA CRM está actualizado y en línea!"
echo -e "========================================================${NC}"
