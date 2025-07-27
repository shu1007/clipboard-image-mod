class ImageEditor {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.originalImageData = null;
        this.currentImage = null;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        
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
        
        this.canvas.addEventListener('mousedown', (e) => this.startSelection(e));
        this.canvas.addEventListener('mousemove', (e) => this.updateSelection(e));
        this.canvas.addEventListener('mouseup', () => this.endSelection());
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
        
        this.canvas.width = this.currentImage.width;
        this.canvas.height = this.currentImage.height;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.currentImage, 0, 0);
        
        this.drawSelection();
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
        
        const rect = this.canvas.getBoundingClientRect();
        this.isSelecting = true;
        this.selectionStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    updateSelection(e) {
        if (!this.isSelecting || !this.currentImage) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.selectionEnd = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.drawImage();
    }
    
    endSelection() {
        this.isSelecting = false;
    }
    
    drawSelection() {
        if (!this.selectionStart || !this.selectionEnd) return;
        
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
        const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
        
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
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
        
        const imageData = this.ctx.getImageData(x, y, width, height);
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        tempCtx.putImageData(imageData, 0, 0);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.resetSelection();
            this.drawImage();
            this.updateDimensionInputs();
        };
        img.src = tempCanvas.toDataURL();
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
    
    async saveToClipboard() {
        if (!this.currentImage) return;
        
        try {
            const dataURL = this.canvas.toDataURL();
            await window.electronAPI.setClipboardImage(dataURL);
            alert('クリップボードに保存しました');
        } catch (error) {
            console.error('Error saving to clipboard:', error);
            alert('クリップボードに保存できませんでした');
        }
    }
}

const editor = new ImageEditor();