# Stage 1: Base image
FROM dunglas/frankenphp AS base

LABEL maintainer="🐘🐳🐧🚀 Naponi"

# Accepter les arguments pour l'environnement
ARG ENVIRONMENT=dev
ARG SERVER_NAME=:80
ARG NODE_VERSION=20
ARG S6_OVERLAY_VERSION=3.1.6.2
ARG USE_S6_OVERLAY=true
ARG ENABLE_WORKER=false
ARG ENABLE_HORIZON=true

# Définir les variables d'environnement par défaut
ENV SERVER_NAME=${SERVER_NAME}
ENV APP_ENV=${ENVIRONMENT}
ENV ENABLE_WORKER=${ENABLE_WORKER}
ENV ENABLE_HORIZON=${ENABLE_HORIZON}

RUN echo "SERVER_NAME=$SERVER_NAME"
RUN echo "ENVIRONMENT=$ENVIRONMENT"
RUN echo "ENABLE_WORKER=$ENABLE_WORKER"
RUN echo "ENABLE_HORIZON=$ENABLE_HORIZON"

# Définir le répertoire de travail (FrankenPHP utilise /app par défaut)
WORKDIR /app

# Installer les extensions PHP nécessaires, en fonction de l'environnement
RUN install-php-extensions \
    @composer \
    pdo_pgsql \
    redis \
    gd \
    bcmath \
    zip \
    exif \
    pcntl \
    intl \
    xsl \
    imagick \
    $(if [ "$ENVIRONMENT" = "prod" ]; then echo "opcache"; else echo "xdebug opcache"; fi)

# Installer des paquets supplémentaires en fonction de l'environnement
RUN apt-get update && \
    apt-get install -y git curl zip unzip cron pkg-config gnupg gosu apt-transport-https libnss3-tools \
    tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng imagemagick poppler-utils && \
    if [ "$ENVIRONMENT" = "dev" ]; then \
    echo "Installation des outils de développement"; \
    fi && \
    # Configurer ImageMagick pour permettre les PDFs
    sed -i 's/^.*policy domain="coder".*pattern="PDF".*$/  <policy domain="coder" rights="read|write" pattern="PDF" \/>/' /etc/ImageMagick-6/policy.xml && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Installer Node.js
RUN curl -sLS https://deb.nodesource.com/setup_$NODE_VERSION.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Gestion de USE_S6_OVERLAY
RUN if [ "$USE_S6_OVERLAY" = "true" ]; then \
    # Installation de s6-overlay
    curl -L https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz -o /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    curl -L https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz -o /tmp/s6-overlay-x86_64.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz && \
    curl -L https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-symlinks-noarch.tar.xz -o /tmp/s6-overlay-symlinks-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-symlinks-noarch.tar.xz && \
    rm -f /tmp/s6-overlay-*.tar.xz && \
    echo "S6 Overlay installé"; \
    else \
    echo "S6 Overlay non installé"; \
    fi

# Copier les fichiers de configuration
COPY docker/Caddyfile /etc/caddy/Caddyfile

# Copier les services s6-overlay si activé
COPY docker/s6-overlay /etc/s6-overlay
RUN if [ "$USE_S6_OVERLAY" = "true" ]; then \
    mkdir -p /etc/services.d && \
    cp -r /etc/s6-overlay/resources/services.d/* /etc/services.d/; \
    echo "Services S6 copiés dans /etc/services.d/"; \
    fi

# Configurer les services de queue
RUN echo "ENABLE_WORKER=$ENABLE_WORKER"
RUN echo "ENABLE_HORIZON=$ENABLE_HORIZON"

# Gestion du worker classique
RUN if [ "$ENABLE_WORKER" = "true" ]; then \
    echo "Worker classique activé"; \
    if [ -f /etc/s6-overlay/resources/services.d/worker/down ]; then rm -f /etc/s6-overlay/resources/services.d/worker/down; fi; \
    else \
    echo "Worker classique désactivé"; \
    mkdir -p /etc/s6-overlay/resources/services.d/worker && touch /etc/s6-overlay/resources/services.d/worker/down; \
    fi

# Gestion d'Horizon
RUN if [ "$ENABLE_HORIZON" = "true" ]; then \
    echo "Horizon activé"; \
    if [ -f /etc/s6-overlay/resources/services.d/horizon/down ]; then rm -f /etc/s6-overlay/resources/services.d/horizon/down; fi; \
    # Rendre les scripts exécutables \
    chmod +x /etc/s6-overlay/resources/services.d/horizon/run; \
    chmod +x /etc/s6-overlay/resources/services.d/horizon/finish; \
    else \
    echo "Horizon désactivé"; \
    mkdir -p /etc/s6-overlay/resources/services.d/horizon && touch /etc/s6-overlay/resources/services.d/horizon/down; \
    fi

# Si Horizon est activé, désactiver le worker classique par défaut pour éviter les conflits
RUN if [ "$ENABLE_HORIZON" = "true" ] && [ "$ENABLE_WORKER" != "true" ]; then \
    echo "Horizon activé - désactivation automatique du worker classique"; \
    mkdir -p /etc/s6-overlay/resources/services.d/worker && touch /etc/s6-overlay/resources/services.d/worker/down; \
    fi

# Copier les fichiers du projet
COPY . /app

# Stage 2: Builder
FROM base AS builder

# Copy composer files
COPY composer.json composer.lock ./

# Installer les dépendances PHP avec ou sans les dépendances de développement
RUN if [ "$ENVIRONMENT" = "prod" ]; then \
    composer install --no-dev --optimize-autoloader --no-scripts; \
    else \
    composer install --no-scripts; \
    fi

# Stage 3: Image finale
FROM base AS final

# Copier le répertoire vendor depuis le builder
COPY --from=builder /app/vendor /app/vendor

# Installer les dépendances Node.js et compiler les assets
RUN if [ -f package.json ]; then \
    rm -rf node_modules && pnpm install && pnpm run build; \
    else \
    echo "Pas de package.json trouvé, ignorant les dépendances Node.js"; \
    fi

# Définir les permissions pour Laravel
RUN mkdir -p /app/storage/framework/{sessions,views,cache} \
    && mkdir -p /app/storage/logs \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache \
    && chmod -R 755 /app/storage /app/bootstrap/cache

# Configurer l'environnement Laravel
RUN if [ "$ENVIRONMENT" = "prod" ]; then \
    echo "Configuration pour l'environnement de production"; \
    php artisan config:cache || true; \
    php artisan route:cache || true; \
    php artisan view:cache || true; \
    else \
    echo "Configuration pour l'environnement de développement"; \
    fi

# Définir les variables d'environnement
ENV ENVIRONMENT=${ENVIRONMENT}
ENV USE_S6_OVERLAY=${USE_S6_OVERLAY}

# Script d'entrée
COPY scripts/entrypoint-wrapper.sh /entrypoint-wrapper.sh
RUN chmod +x /entrypoint-wrapper.sh

# Point d'entrée conditionnel
ENTRYPOINT ["/entrypoint-wrapper.sh"]