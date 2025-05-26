//Arcadia\frontend\src\Utils\Marcadores.js

export function agregarMarcadorOrigen(posicion, mapa, marcadorRef) {
    if (!mapa) return;
    if (marcadorRef.current) marcadorRef.current.setMap(null);
    marcadorRef.current = new window.google.maps.Marker({
        position: posicion,
        map: mapa,
        icon: {
            url: "/icons/origen.svg",
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
        },
        title: "Ubicación actual",
    });
}

export function agregarMarcadorDestino(posicion, mapa, marcadorRef) {
    if (!mapa) return;
    if (marcadorRef.current) marcadorRef.current.setMap(null);
    marcadorRef.current = new window.google.maps.Marker({
        position: posicion,
        map: mapa,
        icon: {
            url: "/icons/destino.svg",
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
        },
        title: "Destino",
    });
}
