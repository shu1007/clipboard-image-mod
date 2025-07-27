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
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        document.getElementById('loadBtn').addEventListener('click', () => this.loadFromClipboard());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveToClipboard());
        document.getElementById('resizeBtn').addEventListener('click', () => this.resizeImage());
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
    }
    
    updateDimensionInputs() {
        if (!this.currentImage) return;
        
        document.getElementById('widthInput').value = this.currentImage.width;
        document.getElementById('heightInput').value = this.currentImage.height;
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
            this.startSelection(e);
        } else if (this.currentMode === 'rect' || this.currentMode === 'circle' || this.currentMode === 'line') {
            this.isDrawing = true;
            this.selectionStart = { x: coords.x, y: coords.y };
        }
    }
    
    onMouseMove(e) {
        if (!this.currentImage) return;
        
        const coords = this.getCanvasCoordinates(e);
        
        if (this.currentMode === 'select') {
            this.updateSelection(e);
        } else if (this.isDrawing) {
            this.selectionEnd = { x: coords.x, y: coords.y };
            this.drawImage();
        }
    }
    
    onMouseUp(e) {
        if (!this.currentImage) return;
        
        if (this.currentMode === 'select') {
            this.endSelection();
        } else if (this.isDrawing) {
            this.finishDrawing();
        }
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
            color: color
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
    
    resetImage() {
        if (!this.originalImageData) return;
        
        this.annotations = [];
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