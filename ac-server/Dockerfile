FROM cm2network/steamcmd:latest

USER root

RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    lib32gcc-s1 \
    libglx0 \
    libx11-6 \
    libxext6 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/steam/ac-server/cfg \
    /home/steam/ac-server/content \
    && chown -R steam:steam /home/steam/ac-server

USER steam

COPY --chown=steam:steam shared-config/ /home/steam/ac-defaults/cfg/

COPY --chmod=755 ac-server/entrypoint.sh /home/steam/entrypoint.sh


WORKDIR /home/steam

EXPOSE 9600/tcp 9600/udp 8081/tcp 20081/udp

ENTRYPOINT ["/home/steam/entrypoint.sh"]
