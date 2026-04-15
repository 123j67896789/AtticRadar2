const map = require('../core/map/map');

function _create_canvas() {
    if (window.atticData.fabricjs_canvas != undefined) {
        window.atticData.fabricjs_canvas.dispose();
    }

    var canvas = new fabric.Canvas('draw_canvas');
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
    canvas.setBackgroundColor('transparent');
    canvas.selection = false;
    $('body').append(canvas.wrapperEl);
    window.atticData.fabricjs_canvas = canvas;
    return canvas;
}

function _finish_polygon(canvas) {
    if (!canvas || !canvas.isPolygonMode || !Array.isArray(canvas.polygonPoints)) {
        return;
    }

    if (canvas.polygonPoints.length < 3) {
        return;
    }

    const polygon = new fabric.Polygon(canvas.polygonPoints.slice(), {
        fill: 'rgba(92, 157, 255, 0.2)',
        stroke: 'rgb(92, 157, 255)',
        strokeWidth: 3,
        selectable: false,
        evented: false
    });

    if (canvas.polygonPreview) {
        canvas.remove(canvas.polygonPreview);
        canvas.polygonPreview = null;
    }

    canvas.add(polygon);
    canvas.polygonPoints = [];
    canvas.renderAll();
}

function _set_polygon_preview(canvas) {
    if (!canvas.polygonPreview) {
        canvas.polygonPreview = new fabric.Polyline(canvas.polygonPoints.slice(), {
            fill: 'rgba(92, 157, 255, 0.12)',
            stroke: 'rgb(92, 157, 255)',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        canvas.add(canvas.polygonPreview);
    }

    canvas.polygonPreview.set({ points: canvas.polygonPoints.slice() });
    canvas.polygonPreview.setCoords();
    canvas.renderAll();
}

function _enable_polygon_mode(canvas) {
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.polygonPoints = [];
    canvas.polygonPreview = null;
    canvas.isPolygonMode = true;

    canvas.off('mouse:down');
    canvas.off('mouse:dblclick');

    canvas.on('mouse:down', function (event) {
        const pointer = canvas.getPointer(event.e);
        const newPoint = { x: pointer.x, y: pointer.y };

        const points = canvas.polygonPoints;
        if (points.length >= 3) {
            const first = points[0];
            const dx = first.x - newPoint.x;
            const dy = first.y - newPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 12) {
                _finish_polygon(canvas);
                return;
            }
        }

        points.push(newPoint);
        _set_polygon_preview(canvas);
    });

    canvas.on('mouse:dblclick', function () {
        _finish_polygon(canvas);
    });
}

function enable_drawing(mode = 'freehand') {
    const canvas = _create_canvas();

    if (mode === 'polygon') {
        _enable_polygon_mode(canvas);
        return;
    }

    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = 7;
    canvas.freeDrawingBrush.color = 'rgb(92, 157, 255)';
    canvas.isPolygonMode = false;
    canvas.polygonPoints = [];
    canvas.polygonPreview = null;
}

function finish_polygon() {
    if (window.atticData.fabricjs_canvas != undefined) {
        _finish_polygon(window.atticData.fabricjs_canvas);
    }
}

function clear_drawing() {
    if (window.atticData.fabricjs_canvas != undefined) {
        const canvas = window.atticData.fabricjs_canvas;
        canvas.remove(...canvas.getObjects());
        canvas.polygonPoints = [];
        canvas.polygonPreview = null;
        canvas.renderAll();
    }
}

function disable_drawing() {
    if (window.atticData.fabricjs_canvas != undefined) {
        window.atticData.fabricjs_canvas.dispose();
        window.atticData.fabricjs_canvas = undefined;
    }
    $('body > canvas').remove();
}

module.exports = {
    enable_drawing,
    finish_polygon,
    clear_drawing,
    disable_drawing
}