

export function marcarParadaPorCoords(coords, tipo, mapRef) {
    if (!coords || !mapRef?.current) return;

    const iconUrl = tipo === "subida"
        ? "/icons/combiSubida.svg"
        : "/icons/combiBajada.svg";

    new window.google.maps.Marker({
        position: coords,
        map: mapRef.current,
        icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(50, 50),
            anchor: new window.google.maps.Point(25, 50),
        },
        title: `Parada de ${tipo}`,
    });
}


