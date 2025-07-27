class ImageEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.originalImageData = null;
        this.currentImage = null;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.currentMode = 'select';
        this.isDrawing = false;
        this.annotations = [];
        this.zoomLevel = 1.0;
        this.displayWidth = 0;
        this.displayHeight = 0;
        this.selectedAnnotation = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragOffset = { x: 0, y: 0 };
        this.preventDimensionUpdate = false;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        document.getElementById('loadBtn').addEventListener('click', () => this.loadFromClipboard());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveToClipboard());
        document.getElementById('resizeBtn').addEventListener('click', () => this.resizeImage());
        
        // Prevent auto-resize when just updating display
        document.getElementById('widthInput').addEventListener('input', () => this.onDimensionInput());
        document.getElementById('heightInput').addEventListener('input', () => this.onDimensionInput());
        document.getElementById('rotateLeftBtn').addEventListener('click', () => this.rotateImage(-90));
        document.getElementById('rotateRightBtn').addEventListener('click', () => this.rotateImage(90));
        document.getElementById('cropBtn').addEventListener('click', () => this.cropImage());
        document.getElementById('resetCropBtn').addEventListener('click', () => this.resetSelection());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetImage());
        
        // Mode buttons
        document.getElementById('selectModeBtn').addEventListener('click', () => this.setMode('select'));
        document.getElementById('textModeBtn').addEventListener('click', () => this.setMode('text'));
        document.getElementById('rectModeBtn').addEventListener('click', () => this.setMode('rect'));
        document.getElementById('circleModeBtn').addEventListener('click', () => this.setMode('circle'));
        document.getElementById('lineModeBtn').addEventListener('click', () => this.setMode('line'));
        
        // Zoom buttons
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('fitToScreenBtn').addEventListener('click', () => this.fitToScreen());
        document.getElementById('actualSizeBtn').addEventListener('click', () => this.actualSize());
        
        // Annotation control buttons
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => this.deleteSelected());
        document.getElementById('bringToFrontBtn').addEventListener('click', () => this.bringToFront());
        document.getElementById('sendToBackBtn').addEventListener('click', () => this.sendToBack());
        
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    }
    
    async loadFromClipboard() {
        try {
            const dataURL = await window.electronAPI.getClipboardImage();
            if (dataURL) {
                this.loadImage(dataURL);
            } else {
                alert('クリップボードに画像がありません');
            }
        } catch (error) {
            console.error('Error loading from clipboard:', error);
            alert('クリップボードから画像を読み込めませんでした');
        }
    }
    
    loadImage(dataURL) {
        const img = new Image();
        img.onload = () => {
            this.originalImageData = dataURL;
            this.currentImage = img;
            this.drawImage();
            this.updateDimensionInputs();
            document.getElementById('saveBtn').disabled = false;
        };
        img.src = dataURL;
    }
    
    drawImage() {
        if (!this.currentImage) return;
        
        this.displayWidth = this.currentImage.width * this.zoomLevel;
        this.displayHeight = this.currentImage.height * this.zoomLevel;
        
        this.canvas.width = this.displayWidth;
        this.canvas.height = this.displayHeight;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0, this.displayWidth, this.displayHeight);
        
        this.drawAnnotations();
        this.drawSelection();
        this.drawCurrentShape();
        this.drawSelectionHandles();
    }
    
    updateDimensionInputs() {
        if (!this.currentImage || this.preventDimensionUpdate) return;
        
        this.preventDimensionUpdate = true;
        document.getElementById('widthInput').value = this.currentImage.width;
        document.getElementById('heightInput').value = this.currentImage.height;
        this.preventDimensionUpdate = false;
    }
    
    onDimensionInput() {
        // This is called when user types in dimension inputs
        // We don't auto-resize here, only when they click the resize button
    }
    
    resizeImage() {
        if (!this.currentImage) return;
        
        const newWidth = parseInt(document.getElementById('widthInput').value);
        const newHeight = parseInt(document.getElementById('heightInput').value);
        
        if (newWidth <= 0 || newHeight <= 0) {
            alert('有効な幅と高さを入力してください');
            return;
        }
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        
        tempCtx.drawImage(this.currentImage, 0, 0, newWidth, newHeight);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawImage();
        };
        img.src = tempCanvas.toDataURL();
    }
    
    rotateImage(degrees) {
        if (!this.currentImage) return;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (Math.abs(degrees) === 90) {
            tempCanvas.width = this.currentImage.height;
            tempCanvas.height = this.currentImage.width;
        } else {
            tempCanvas.width = this.currentImage.width;
            tempCanvas.height = this.currentImage.height;
        }
        
        tempCtx.save();
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(degrees * Math.PI / 180);
        tempCtx.drawImage(this.currentImage, -this.currentImage.width / 2, -this.currentImage.height / 2);
        tempCtx.restore();
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawImage();
            this.updateDimensionInputs();
        };
        img.src = tempCanvas.toDataURL();
    }
    
    startSelection(e) {
        if (!this.currentImage) return;
        
        const coords = this.getCanvasCoordinates(e);
        this.isSelecting = true;
        this.selectionStart = {
            x: coords.x,
            y: coords.y
        };
    }
    
    updateSelection(e) {
        if (!this.isSelecting || !this.currentImage) return;
        
        const coords = this.getCanvasCoordinates(e);
        this.selectionEnd = {
            x: coords.x,
            y: coords.y
        };
        
        this.drawImage();
    }
    
    endSelection() {
        this.isSelecting = false;
    }
    
    drawSelection() {
        if (!this.selectionStart || !this.selectionEnd || this.currentMode !== 'select') return;
        
        this.ctx.save();
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
        
        this.ctx.restore();
    }
    
    cropImage() {
        if (!this.currentImage || !this.selectionStart || !this.selectionEnd) {
            alert('トリミング範囲を選択してください');
            return;
        }
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        if (width <= 0 || height <= 0) {
            alert('有効な範囲を選択してください');
            return;
        }
        
        // Create a temporary canvas with original image to get the cropped portion
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.currentImage.width;
        tempCanvas.height = this.currentImage.height;
        
        // Draw original image and annotations
        tempCtx.drawImage(this.currentImage, 0, 0);
        
        // Draw annotations on the temporary canvas
        this.annotations.forEach(annotation => {
            if (annotation.type === 'text') {
                tempCtx.fillStyle = annotation.color;
                tempCtx.font = `${annotation.fontSize}px Arial`;
                tempCtx.fillText(annotation.text, annotation.x, annotation.y);
            } else {
                tempCtx.strokeStyle = annotation.strokeColor;
                tempCtx.fillStyle = annotation.fillColor;
                tempCtx.lineWidth = annotation.lineWidth;
                
                if (annotation.type === 'rect') {
                    const w = annotation.endX - annotation.startX;
                    const h = annotation.endY - annotation.startY;
                    if (annotation.fillShape) {
                        tempCtx.fillRect(annotation.startX, annotation.startY, w, h);
                    }
                    tempCtx.strokeRect(annotation.startX, annotation.startY, w, h);
                } else if (annotation.type === 'circle') {
                    const centerX = (annotation.startX + annotation.endX) / 2;
                    const centerY = (annotation.startY + annotation.endY) / 2;
                    const radius = Math.sqrt(Math.pow(annotation.endX - annotation.startX, 2) + Math.pow(annotation.endY - annotation.startY, 2)) / 2;
                    tempCtx.beginPath();
                    tempCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    if (annotation.fillShape) {
                        tempCtx.fill();
                    }
                    tempCtx.stroke();
                } else if (annotation.type === 'line') {
                    tempCtx.beginPath();
                    tempCtx.moveTo(annotation.startX, annotation.startY);
                    tempCtx.lineTo(annotation.endX, annotation.endY);
                    tempCtx.stroke();
                }
            }
        });
        
        // Get the cropped image data
        const imageData = tempCtx.getImageData(x, y, width, height);
        
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        cropCanvas.width = width;
        cropCanvas.height = height;
        cropCtx.putImageData(imageData, 0, 0);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.annotations = []; // Clear annotations after crop
            this.resetSelection();
            this.drawImage();
            this.updateDimensionInputs();
        };
        img.src = cropCanvas.toDataURL();
    }
    
    resetSelection() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.drawImage();
    }
    
    resetImage() {
        if (!this.originalImageData) return;
        
        this.loadImage(this.originalImageData);
        this.resetSelection();
    }
    
    setMode(mode) {
        this.currentMode = mode;
        this.resetSelection();
        
        // Update button styles
        document.querySelectorAll('.button-group button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(mode + 'ModeBtn').classList.add('active');
        
        // Update cursor
        switch(mode) {
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
            case 'rect':
            case 'circle':
            case 'line':
                this.canvas.style.cursor = 'crosshair';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }
    
    onMouseDown(e) {
        if (!this.currentImage) return;
        
        const coords = this.getCanvasCoordinates(e);
        
        if (this.currentMode === 'select') {
            // Check for resize handle first
            const handle = this.getResizeHandle(coords.x, coords.y);
            if (handle && this.selectedAnnotation) {
                this.isResizing = true;
                this.resizeHandle = handle;
                return;
            }
            
            // Check for annotation selection
            const annotation = this.getAnnotationAt(coords.x, coords.y);
            if (annotation) {
                this.selectAnnotation(annotation);
                this.isDragging = true;
                this.dragOffset = {
                    x: coords.x - (annotation.x || annotation.startX),
                    y: coords.y - (annotation.y || annotation.startY)
                };
            } else {
                this.selectedAnnotation = null;
                this.startSelection(e);
            }
        } else if (this.currentMode === 'rect' || this.currentMode === 'circle' || this.currentMode === 'line') {
            this.isDrawing = true;
            this.selectionStart = { x: coords.x, y: coords.y };
        }
        
        this.updateSelectionButtons();
        this.drawImage();
    }
    
    onMouseMove(e) {
        if (!this.currentImage) return;
        
        const coords = this.getCanvasCoordinates(e);
        
        if (this.currentMode === 'select') {
            if (this.isResizing && this.selectedAnnotation) {
                this.resizeAnnotation(coords.x, coords.y);
                this.drawImage();
            } else if (this.isDragging && this.selectedAnnotation) {
                this.moveAnnotation(coords.x, coords.y);
                this.drawImage();
            } else {
                this.updateSelection(e);
                // Update cursor based on hover
                this.updateCursor(coords.x, coords.y);
            }
        } else if (this.isDrawing) {
            this.selectionEnd = { x: coords.x, y: coords.y };
            this.drawImage();
        }
    }
    
    onMouseUp(e) {
        if (!this.currentImage) return;
        
        if (this.currentMode === 'select') {
            this.isDragging = false;
            this.isResizing = false;
            this.resizeHandle = null;
            this.endSelection();
        } else if (this.isDrawing) {
            this.finishDrawing();
        }
        
        this.drawImage();
    }
    
    onCanvasClick(e) {
        if (!this.currentImage || this.currentMode !== 'text') return;
        
        const coords = this.getCanvasCoordinates(e);
        this.addText(coords.x, coords.y);
    }
    
    addText(x, y) {
        const text = document.getElementById('textInput').value;
        if (!text.trim()) {
            alert('テキストを入力してください');
            return;
        }
        
        const fontSize = parseInt(document.getElementById('fontSizeInput').value);
        const color = document.getElementById('textColorInput').value;
        
        const annotation = {
            type: 'text',
            x: x,
            y: y,
            text: text,
            fontSize: fontSize,
            originalFontSize: fontSize,
            color: color,
            scale: 1.0
        };
        
        this.annotations.push(annotation);
        this.drawImage();
    }
    
    finishDrawing() {
        if (!this.selectionStart || !this.selectionEnd) {
            this.isDrawing = false;
            return;
        }
        
        const strokeColor = document.getElementById('strokeColorInput').value;
        const fillColor = document.getElementById('fillColorInput').value;
        const lineWidth = parseInt(document.getElementById('lineWidthInput').value);
        const fillShape = document.getElementById('fillShapeInput').checked;
        
        const annotation = {
            type: this.currentMode,
            startX: this.selectionStart.x,
            startY: this.selectionStart.y,
            endX: this.selectionEnd.x,
            endY: this.selectionEnd.y,
            strokeColor: strokeColor,
            fillColor: fillColor,
            lineWidth: lineWidth,
            fillShape: fillShape
        };
        
        this.annotations.push(annotation);
        this.isDrawing = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.drawImage();
    }
    
    drawCurrentShape() {
        if (!this.isDrawing || !this.selectionStart || !this.selectionEnd) return;
        
        const strokeColor = document.getElementById('strokeColorInput').value;
        const fillColor = document.getElementById('fillColorInput').value;
        const lineWidth = parseInt(document.getElementById('lineWidthInput').value);
        const fillShape = document.getElementById('fillShapeInput').checked;
        
        this.ctx.save();
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        this.ctx.strokeStyle = strokeColor;
        this.ctx.fillStyle = fillColor;
        this.ctx.lineWidth = lineWidth;
        
        const startX = this.selectionStart.x;
        const startY = this.selectionStart.y;
        const endX = this.selectionEnd.x;
        const endY = this.selectionEnd.y;
        
        if (this.currentMode === 'rect') {
            const width = endX - startX;
            const height = endY - startY;
            
            if (fillShape) {
                this.ctx.fillRect(startX, startY, width, height);
            }
            this.ctx.strokeRect(startX, startY, width, height);
        } else if (this.currentMode === 'circle') {
            const centerX = (startX + endX) / 2;
            const centerY = (startY + endY) / 2;
            const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 2;
            
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            if (fillShape) {
                this.ctx.fill();
            }
            this.ctx.stroke();
        } else if (this.currentMode === 'line') {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Convert display coordinates to image coordinates
        const imageX = canvasX / this.zoomLevel;
        const imageY = canvasY / this.zoomLevel;
        
        return { x: imageX, y: imageY };
    }
    
    drawAnnotations() {
        this.ctx.save();
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        this.annotations.forEach(annotation => {
            if (annotation.type === 'text') {
                this.ctx.fillStyle = annotation.color;
                this.ctx.font = `${annotation.fontSize}px Arial`;
                this.ctx.fillText(annotation.text, annotation.x, annotation.y);
            } else {
                this.ctx.strokeStyle = annotation.strokeColor;
                this.ctx.fillStyle = annotation.fillColor;
                this.ctx.lineWidth = annotation.lineWidth;
                
                if (annotation.type === 'rect') {
                    const width = annotation.endX - annotation.startX;
                    const height = annotation.endY - annotation.startY;
                    
                    if (annotation.fillShape) {
                        this.ctx.fillRect(annotation.startX, annotation.startY, width, height);
                    }
                    this.ctx.strokeRect(annotation.startX, annotation.startY, width, height);
                } else if (annotation.type === 'circle') {
                    const centerX = (annotation.startX + annotation.endX) / 2;
                    const centerY = (annotation.startY + annotation.endY) / 2;
                    const radius = Math.sqrt(Math.pow(annotation.endX - annotation.startX, 2) + Math.pow(annotation.endY - annotation.startY, 2)) / 2;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                    if (annotation.fillShape) {
                        this.ctx.fill();
                    }
                    this.ctx.stroke();
                } else if (annotation.type === 'line') {
                    this.ctx.beginPath();
                    this.ctx.moveTo(annotation.startX, annotation.startY);
                    this.ctx.lineTo(annotation.endX, annotation.endY);
                    this.ctx.stroke();
                }
            }
        });
        
        this.ctx.restore();
    }
    
    getTextBounds(annotation) {
        // Create temporary context to measure text accurately
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${annotation.fontSize}px Arial`;
        
        const metrics = tempCtx.measureText(annotation.text);
        const textWidth = metrics.width;
        const textHeight = annotation.fontSize;
        
        return {
            x: annotation.x,
            y: annotation.y - textHeight,
            width: textWidth,
            height: textHeight
        };
    }
    
    getAnnotationAt(x, y) {
        // Check annotations in reverse order (top to bottom)
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            const annotation = this.annotations[i];
            
            if (annotation.type === 'text') {
                const bounds = this.getTextBounds(annotation);
                
                if (x >= bounds.x && x <= bounds.x + bounds.width &&
                    y >= bounds.y && y <= bounds.y + bounds.height) {
                    return annotation;
                }
            } else {
                const minX = Math.min(annotation.startX, annotation.endX);
                const maxX = Math.max(annotation.startX, annotation.endX);
                const minY = Math.min(annotation.startY, annotation.endY);
                const maxY = Math.max(annotation.startY, annotation.endY);
                
                if (annotation.type === 'rect') {
                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                        return annotation;
                    }
                } else if (annotation.type === 'circle') {
                    const centerX = (annotation.startX + annotation.endX) / 2;
                    const centerY = (annotation.startY + annotation.endY) / 2;
                    const radius = Math.sqrt(Math.pow(annotation.endX - annotation.startX, 2) + Math.pow(annotation.endY - annotation.startY, 2)) / 2;
                    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    
                    if (distance <= radius) {
                        return annotation;
                    }
                } else if (annotation.type === 'line') {
                    // Simple line hit test (within 5 pixels)
                    const lineDistance = this.distanceToLine(x, y, annotation.startX, annotation.startY, annotation.endX, annotation.endY);
                    if (lineDistance <= 5) {
                        return annotation;
                    }
                }
            }
        }
        return null;
    }
    
    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        if (param < 0) {
            return Math.sqrt(A * A + B * B);
        } else if (param > 1) {
            const dx = px - x2;
            const dy = py - y2;
            return Math.sqrt(dx * dx + dy * dy);
        } else {
            const dx = px - (x1 + param * C);
            const dy = py - (y1 + param * D);
            return Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    selectAnnotation(annotation) {
        this.selectedAnnotation = annotation;
        this.updateSelectionButtons();
    }
    
    updateSelectionButtons() {
        const hasSelection = this.selectedAnnotation !== null;
        document.getElementById('deleteSelectedBtn').disabled = !hasSelection;
        document.getElementById('bringToFrontBtn').disabled = !hasSelection;
        document.getElementById('sendToBackBtn').disabled = !hasSelection;
    }
    
    moveAnnotation(x, y) {
        if (!this.selectedAnnotation) return;
        
        const newX = x - this.dragOffset.x;
        const newY = y - this.dragOffset.y;
        
        if (this.selectedAnnotation.type === 'text') {
            this.selectedAnnotation.x = newX;
            this.selectedAnnotation.y = newY;
        } else {
            const deltaX = newX - this.selectedAnnotation.startX;
            const deltaY = newY - this.selectedAnnotation.startY;
            
            this.selectedAnnotation.startX = newX;
            this.selectedAnnotation.startY = newY;
            this.selectedAnnotation.endX += deltaX;
            this.selectedAnnotation.endY += deltaY;
        }
    }
    
    getResizeHandle(x, y) {
        if (!this.selectedAnnotation) return null;
        
        const handleSize = 8;
        
        if (this.selectedAnnotation.type === 'text') {
            // Check text corner handles (for visual feedback, but no actual resizing)
            const bounds = this.getTextBounds(this.selectedAnnotation);
            const corners = [
                { name: 'nw', x: bounds.x, y: bounds.y },
                { name: 'ne', x: bounds.x + bounds.width, y: bounds.y },
                { name: 'sw', x: bounds.x, y: bounds.y + bounds.height },
                { name: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height }
            ];
            
            for (const corner of corners) {
                if (Math.abs(x - corner.x) <= handleSize && Math.abs(y - corner.y) <= handleSize) {
                    return corner.name;
                }
            }
        } else {
            const handles = this.getResizeHandles();
            
            for (const [name, handle] of Object.entries(handles)) {
                if (Math.abs(x - handle.x) <= handleSize && Math.abs(y - handle.y) <= handleSize) {
                    return name;
                }
            }
        }
        
        return null;
    }
    
    getResizeHandles() {
        if (!this.selectedAnnotation || this.selectedAnnotation.type === 'text') return {};
        
        const ann = this.selectedAnnotation;
        const minX = Math.min(ann.startX, ann.endX);
        const maxX = Math.max(ann.startX, ann.endX);
        const minY = Math.min(ann.startY, ann.endY);
        const maxY = Math.max(ann.startY, ann.endY);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        return {
            'nw': { x: minX, y: minY },
            'ne': { x: maxX, y: minY },
            'sw': { x: minX, y: maxY },
            'se': { x: maxX, y: maxY },
            'n': { x: centerX, y: minY },
            's': { x: centerX, y: maxY },
            'w': { x: minX, y: centerY },
            'e': { x: maxX, y: centerY }
        };
    }
    
    resizeAnnotation(x, y) {
        if (!this.selectedAnnotation || !this.resizeHandle) return;
        
        const ann = this.selectedAnnotation;
        
        if (ann.type === 'text') {
            // Initialize scale properties if they don't exist (for backward compatibility)
            if (ann.scale === undefined) {
                ann.originalFontSize = ann.fontSize;
                ann.scale = 1.0;
            }
            
            // Calculate scale based on handle movement
            const bounds = this.getTextBounds(ann);
            const originalWidth = bounds.width / ann.scale;
            const originalHeight = bounds.height / ann.scale;
            
            let newScale = ann.scale;
            
            switch (this.resizeHandle) {
                case 'se': // Bottom-right corner - most intuitive
                    const newWidth = x - ann.x;
                    const newHeight = (ann.y) - y; // y grows downward, but text y is baseline
                    newScale = Math.max(0.1, Math.min(newWidth / originalWidth, Math.abs(newHeight) / originalHeight));
                    break;
                case 'nw': // Top-left corner
                    const deltaX = ann.x - x;
                    const deltaY = y - (ann.y - bounds.height);
                    newScale = Math.max(0.1, Math.min(deltaX / originalWidth, deltaY / originalHeight));
                    // Move the text position when resizing from top-left
                    ann.x = x;
                    ann.y = y + (bounds.height * newScale);
                    break;
                case 'ne': // Top-right corner
                    const widthFromNE = x - ann.x;
                    const heightFromNE = (ann.y - bounds.height) - y;
                    newScale = Math.max(0.1, Math.min(widthFromNE / originalWidth, heightFromNE / originalHeight));
                    ann.y = y + (bounds.height * newScale);
                    break;
                case 'sw': // Bottom-left corner
                    const widthFromSW = ann.x - x;
                    const heightFromSW = (ann.y) - y;
                    newScale = Math.max(0.1, Math.min(widthFromSW / originalWidth, Math.abs(heightFromSW) / originalHeight));
                    ann.x = x;
                    break;
            }
            
            ann.scale = Math.max(0.1, Math.min(5.0, newScale)); // Limit scale between 0.1x and 5x
            ann.fontSize = Math.round(ann.originalFontSize * ann.scale);
            return;
        }
        
        switch (this.resizeHandle) {
            case 'nw':
                ann.startX = x;
                ann.startY = y;
                break;
            case 'ne':
                ann.endX = x;
                ann.startY = y;
                break;
            case 'sw':
                ann.startX = x;
                ann.endY = y;
                break;
            case 'se':
                ann.endX = x;
                ann.endY = y;
                break;
            case 'n':
                ann.startY = y;
                break;
            case 's':
                ann.endY = y;
                break;
            case 'w':
                ann.startX = x;
                break;
            case 'e':
                ann.endX = x;
                break;
        }
    }
    
    updateCursor(x, y) {
        if (this.selectedAnnotation) {
            const handle = this.getResizeHandle(x, y);
            if (handle) {
                const cursors = {
                    'nw': 'nw-resize',
                    'ne': 'ne-resize',
                    'sw': 'sw-resize',
                    'se': 'se-resize',
                    'n': 'n-resize',
                    's': 's-resize',
                    'w': 'w-resize',
                    'e': 'e-resize'
                };
                this.canvas.style.cursor = cursors[handle];
                return;
            }
        }
        
        const annotation = this.getAnnotationAt(x, y);
        this.canvas.style.cursor = annotation ? 'move' : 'crosshair';
    }
    
    drawSelectionHandles() {
        if (!this.selectedAnnotation) return;
        
        this.ctx.save();
        this.ctx.scale(this.zoomLevel, this.zoomLevel);
        
        if (this.selectedAnnotation.type === 'text') {
            // Draw text bounding box
            const bounds = this.getTextBounds(this.selectedAnnotation);
            
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([3, 3]);
            this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            this.ctx.setLineDash([]);
            
            // Draw corner handles for text
            const handleSize = 6;
            this.ctx.fillStyle = '#007bff';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            
            const corners = [
                { x: bounds.x, y: bounds.y },
                { x: bounds.x + bounds.width, y: bounds.y },
                { x: bounds.x, y: bounds.y + bounds.height },
                { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
            ];
            
            corners.forEach(corner => {
                this.ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
                this.ctx.strokeRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
            });
        } else {
            // Draw resize handles for shapes
            const handles = this.getResizeHandles();
            const handleSize = 6;
            
            this.ctx.fillStyle = '#007bff';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            
            for (const handle of Object.values(handles)) {
                this.ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
                this.ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            }
        }
        
        this.ctx.restore();
    }
    
    deleteSelected() {
        if (!this.selectedAnnotation) return;
        
        const index = this.annotations.indexOf(this.selectedAnnotation);
        if (index > -1) {
            this.annotations.splice(index, 1);
            this.selectedAnnotation = null;
            this.updateSelectionButtons();
            this.drawImage();
        }
    }
    
    bringToFront() {
        if (!this.selectedAnnotation) return;
        
        const index = this.annotations.indexOf(this.selectedAnnotation);
        if (index > -1) {
            this.annotations.splice(index, 1);
            this.annotations.push(this.selectedAnnotation);
            this.drawImage();
        }
    }
    
    sendToBack() {
        if (!this.selectedAnnotation) return;
        
        const index = this.annotations.indexOf(this.selectedAnnotation);
        if (index > -1) {
            this.annotations.splice(index, 1);
            this.annotations.unshift(this.selectedAnnotation);
            this.drawImage();
        }
    }
    
    resetImage() {
        if (!this.originalImageData) return;
        
        this.annotations = [];
        this.selectedAnnotation = null;
        this.updateSelectionButtons();
        this.loadImage(this.originalImageData);
        this.resetSelection();
    }
    
    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.25, 5.0);
        this.updateZoomDisplay();
        this.drawImage();
    }
    
    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.25, 0.1);
        this.updateZoomDisplay();
        this.drawImage();
    }
    
    fitToScreen() {
        if (!this.currentImage) return;
        
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.clientWidth - 32; // padding
        const containerHeight = container.clientHeight - 32;
        
        const scaleX = containerWidth / this.currentImage.width;
        const scaleY = containerHeight / this.currentImage.height;
        
        this.zoomLevel = Math.min(scaleX, scaleY, 1.0);
        this.updateZoomDisplay();
        this.drawImage();
    }
    
    actualSize() {
        this.zoomLevel = 1.0;
        this.updateZoomDisplay();
        this.drawImage();
    }
    
    updateZoomDisplay() {
        document.getElementById('zoomDisplay').textContent = Math.round(this.zoomLevel * 100) + '%';
    }
    
    async saveToClipboard() {
        if (!this.currentImage) return;
        
        try {
            // Create a canvas with the final image including all annotations
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            finalCanvas.width = this.currentImage.width;
            finalCanvas.height = this.currentImage.height;
            
            // Draw the original image
            finalCtx.drawImage(this.currentImage, 0, 0);
            
            // Draw all annotations at original scale
            this.annotations.forEach(annotation => {
                if (annotation.type === 'text') {
                    finalCtx.fillStyle = annotation.color;
                    finalCtx.font = `${annotation.fontSize}px Arial`;
                    finalCtx.fillText(annotation.text, annotation.x, annotation.y);
                } else {
                    finalCtx.strokeStyle = annotation.strokeColor;
                    finalCtx.fillStyle = annotation.fillColor;
                    finalCtx.lineWidth = annotation.lineWidth;
                    
                    if (annotation.type === 'rect') {
                        const width = annotation.endX - annotation.startX;
                        const height = annotation.endY - annotation.startY;
                        if (annotation.fillShape) {
                            finalCtx.fillRect(annotation.startX, annotation.startY, width, height);
                        }
                        finalCtx.strokeRect(annotation.startX, annotation.startY, width, height);
                    } else if (annotation.type === 'circle') {
                        const centerX = (annotation.startX + annotation.endX) / 2;
                        const centerY = (annotation.startY + annotation.endY) / 2;
                        const radius = Math.sqrt(Math.pow(annotation.endX - annotation.startX, 2) + Math.pow(annotation.endY - annotation.startY, 2)) / 2;
                        finalCtx.beginPath();
                        finalCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                        if (annotation.fillShape) {
                            finalCtx.fill();
                        }
                        finalCtx.stroke();
                    } else if (annotation.type === 'line') {
                        finalCtx.beginPath();
                        finalCtx.moveTo(annotation.startX, annotation.startY);
                        finalCtx.lineTo(annotation.endX, annotation.endY);
                        finalCtx.stroke();
                    }
                }
            });
            
            const dataURL = finalCanvas.toDataURL();
            await window.electronAPI.setClipboardImage(dataURL);
            alert('クリップボードに保存しました');
        } catch (error) {
            console.error('Error saving to clipboard:', error);
            alert('クリップボードに保存できませんでした');
        }
    }
}

const editor = new ImageEditor();