# PullyJS

Pull-to-refresh library ligera y sin dependencias.

## Instalación

```html
<script src="pully.js"></script>
```

## Uso

### Mínimo (solo contenedor)

```javascript
const pully = new Pully('#mi-contenedor', {
  onRefresh: async () => {
    // Tu lógica de refresh aquí
    await fetch('/api/data');
  }
});
```

### Opciones

```javascript
const pully = new Pully('#mi-contenedor', {
  onRefresh: async () => {
    // Lógica asíncrona de refresh
  },
  onRelease: () => {
    // Se ejecuta al soltar (antes del refresh)
  },
  threshold: 100 // Pixeles para activar refresh (default: 100)
});
```

### Destroy

```javascript
pully.destroy();
```

## Características

- ✅ Solo requiere inicializar con un contenedor
- ✅ Soporte touch y mouse
- ✅ Indicador visual con spinner
- ✅ Sin dependencias
- ✅ Funciona como script global, ES Module o CommonJS
