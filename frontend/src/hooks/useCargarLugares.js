// src/hooks/useCargarLugares.js
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../Pages/firebase-config"; // ✅ Usa db exportado

export default function useCargarLugares(categoria) {
    const [lugares, setLugares] = useState([]);

    useEffect(() => {
        const cargar = async () => {
            try {
                let q = collection(db, "lugares");
                if (categoria) {
                    q = query(q, where("tipo", "==", categoria));
                }
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLugares(data);
            } catch (error) {
                console.error("Error al cargar lugares:", error);
            }
        };

        cargar();
    }, [categoria]);

    return lugares;
}
