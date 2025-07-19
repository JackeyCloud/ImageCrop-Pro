class ImageCropPro {
    constructor() {
        this.uploadedFiles = [];
        this.processedImages = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.formatSelect = document.getElementById('formatSelect');
        this.customRatio = document.getElementById('customRatio');
        this.ratioWidth = document.getElementById('ratioWidth');
        this.ratioHeight = document.getElementById('ratioHeight');
        this.qualitySlider = document.getElementById('qualitySlider');
        this.qualityValue = document.getElementById('qualityValue');
        this.processBtn = document.getElementById('processBtn');
        this.previewSection = document.getElementById('previewSection');
        this.previewGrid = document.getElementById('previewGrid');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
    }

    bindEvents() {
        // 文件上传事件
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖拽上传
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 设置面板事件
        this.formatSelect.addEventListener('change', () => this.handleFormatChange());
        this.qualitySlider.addEventListener('input', (e) => this.updateQualityValue(e));
        
        // 处理按钮
        this.processBtn.addEventListener('click', () => this.processImages());
        
        // 下载按钮
        this.downloadBtn.addEventListener('click', () => this.downloadImages());
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.addFiles(files);
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = Array.from(event.dataTransfer.files);
        this.addFiles(files);
    }

    addFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            alert('请选择图片文件！');
            return;
        }

        this.uploadedFiles = [...this.uploadedFiles, ...imageFiles];
        this.showSettingsPanel();
        this.updateFileCount();
    }

    showSettingsPanel() {
        this.settingsPanel.style.display = 'block';
        this.updateFileCount();
    }

    updateFileCount() {
        const count = this.uploadedFiles.length;
        this.processBtn.innerHTML = `<i class="fas fa-magic"></i> 开始处理 (${count} 张图片)`;
    }

    handleFormatChange() {
        const format = this.formatSelect.value;
        if (format === 'custom') {
            this.customRatio.style.display = 'flex';
        } else {
            this.customRatio.style.display = 'none';
        }
    }

    updateQualityValue(event) {
        this.qualityValue.textContent = `${event.target.value}%`;
    }

    getAspectRatio() {
        const format = this.formatSelect.value;
        const ratios = {
            'a4': 210 / 297, // A4 竖版 (宽度/高度 = 210/297 = 0.707)
            'a4-landscape': 297 / 210, // A4 横版 (宽度/高度 = 297/210 = 1.414)
            'a3': 297 / 420, // A3 竖版 (宽度/高度 = 297/420 = 0.707)
            'a3-landscape': 420 / 297, // A3 横版 (宽度/高度 = 420/297 = 1.414)
            'a5': 148 / 210, // A5 竖版 (宽度/高度 = 148/210 = 0.705)
            'a5-landscape': 210 / 148, // A5 横版 (宽度/高度 = 210/148 = 1.419)
            'letter': 216 / 279, // Letter 竖版 (宽度/高度 = 216/279 = 0.774)
            'letter-landscape': 279 / 216, // Letter 横版 (宽度/高度 = 279/216 = 1.292)
            'square': 1,
            'custom': this.ratioWidth.value / this.ratioHeight.value
        };
        return ratios[format] || 1;
    }

    async processImages() {
        if (this.uploadedFiles.length === 0) {
            alert('请先上传图片！');
            return;
        }

        this.processBtn.disabled = true;
        this.processBtn.innerHTML = '<div class="loading"></div>处理中...';
        
        this.processedImages = [];
        const quality = this.qualitySlider.value / 100;
        const aspectRatio = this.getAspectRatio();

        this.progressBar.style.display = 'block';
        this.progressFill.style.width = '0%';

        for (let i = 0; i < this.uploadedFiles.length; i++) {
            const file = this.uploadedFiles[i];
            try {
                const processedImage = await this.processImage(file, aspectRatio, quality);
                this.processedImages.push({
                    original: file,
                    processed: processedImage,
                    name: file.name
                });
            } catch (error) {
                console.error('处理图片失败:', error);
            }

            // 更新进度
            const progress = ((i + 1) / this.uploadedFiles.length) * 100;
            this.progressFill.style.width = `${progress}%`;
        }

        this.showPreview();
        this.processBtn.disabled = false;
        this.processBtn.innerHTML = '<i class="fas fa-magic"></i> 重新处理';
        this.progressBar.style.display = 'none';
    }

    async processImage(file, aspectRatio, quality) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 计算裁剪尺寸，保持原始图片完整内容
                let cropWidth, cropHeight, cropX, cropY;
                
                const imgAspectRatio = img.width / img.height;
                
                // 目标A4比例是 210/297 = 0.707 (宽度/高度)
                // 我们需要确保输出的是竖版A4，即高度大于宽度
                if (imgAspectRatio > aspectRatio) {
                    // 图片更宽，需要裁剪宽度，保持高度
                    cropHeight = img.height;
                    cropWidth = img.height * aspectRatio; // 使用高度乘以比例得到宽度
                    cropX = (img.width - cropWidth) / 2;
                    cropY = 0;
                } else {
                    // 图片更高，需要裁剪高度，保持宽度
                    cropWidth = img.width;
                    cropHeight = img.width / aspectRatio; // 使用宽度除以比例得到高度
                    cropX = 0;
                    cropY = (img.height - cropHeight) / 2;
                }

                // 确保裁剪区域不超出图片边界
                if (cropX < 0) cropX = 0;
                if (cropY < 0) cropY = 0;
                if (cropX + cropWidth > img.width) cropWidth = img.width - cropX;
                if (cropY + cropHeight > img.height) cropHeight = img.height - cropY;

                // 调试信息
                console.log(`处理图片: ${file.name}`);
                console.log(`原始尺寸: ${img.width} x ${img.height}`);
                console.log(`原始比例: ${imgAspectRatio}`);
                console.log(`目标比例: ${aspectRatio}`);
                console.log(`裁剪区域: ${cropWidth} x ${cropHeight} at (${cropX}, ${cropY})`);
                console.log(`输出比例: ${cropWidth / cropHeight}`);
                console.log('---');

                // 设置画布尺寸
                canvas.width = cropWidth;
                canvas.height = cropHeight;

                // 绘制裁剪后的图片
                ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

                // 验证输出比例
                const outputRatio = cropWidth / cropHeight;
                const expectedRatio = 210 / 297; // A4宽度/高度比例
                console.log(`验证输出比例: ${outputRatio.toFixed(3)} (期望: ${expectedRatio.toFixed(3)})`);

                // 转换为Blob
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    showPreview() {
        this.previewSection.style.display = 'block';
        this.previewGrid.innerHTML = '';

        this.processedImages.forEach((item, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            const originalUrl = URL.createObjectURL(item.original);
            const processedUrl = URL.createObjectURL(item.processed);

            previewItem.innerHTML = `
                <h4>${item.name}</h4>
                <div class="compare-container">
                    <div class="compare-labels">
                        <span class="label-before">处理前</span>
                        <span class="label-after">处理后</span>
                    </div>
                    <div class="compare-wrapper">
                        <img class="compare-before" src="${originalUrl}" alt="原图">
                        <img class="compare-after" src="${processedUrl}" alt="处理后">
                        <div class="compare-slider">
                            <div class="compare-handle">
                                <div class="compare-handle-line"></div>
                                <div class="compare-handle-circle">
                                    <i class="fas fa-arrows-alt-h"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.previewGrid.appendChild(previewItem);
            
            // 初始化拖拽对比功能
            this.initCompareSlider(previewItem.querySelector('.compare-wrapper'));
        });
    }

    initCompareSlider(container) {
        const beforeImg = container.querySelector('.compare-before');
        const afterImg = container.querySelector('.compare-after');
        const slider = container.querySelector('.compare-slider');
        const handle = container.querySelector('.compare-handle');
        
        let isDragging = false;
        let startX, startLeft;

        // 设置初始位置
        const setSliderPosition = (x) => {
            const rect = container.getBoundingClientRect();
            const maxX = rect.width;
            const clampedX = Math.max(0, Math.min(x, maxX));
            const percentage = (clampedX / maxX) * 100;
            
            slider.style.left = `${percentage}%`;
            afterImg.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        };

        // 鼠标事件
        const handleMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = parseFloat(slider.style.left) || 50;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const rect = container.getBoundingClientRect();
            const newLeft = startLeft + (deltaX / rect.width) * 100;
            setSliderPosition((newLeft / 100) * rect.width);
        };

        const handleMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // 触摸事件
        const handleTouchStart = (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            startLeft = parseFloat(slider.style.left) || 50;
            e.preventDefault();
        };

        const handleTouchMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - startX;
            const rect = container.getBoundingClientRect();
            const newLeft = startLeft + (deltaX / rect.width) * 100;
            setSliderPosition((newLeft / 100) * rect.width);
            e.preventDefault();
        };

        const handleTouchEnd = () => {
            isDragging = false;
        };

        // 绑定事件
        handle.addEventListener('mousedown', handleMouseDown);
        handle.addEventListener('touchstart', handleTouchStart);
        container.addEventListener('touchmove', handleTouchMove);
        container.addEventListener('touchend', handleTouchEnd);

        // 设置初始位置
        setSliderPosition(container.offsetWidth / 2);
    }

    async downloadImages() {
        if (this.processedImages.length === 0) {
            alert('没有可下载的图片！');
            return;
        }

        this.downloadBtn.disabled = true;
        this.downloadBtn.innerHTML = '<div class="loading"></div>打包中...';

        try {
            const zip = new JSZip();
            
            // 添加处理后的图片到zip
            for (let i = 0; i < this.processedImages.length; i++) {
                const item = this.processedImages[i];
                const fileName = this.getProcessedFileName(item.name);
                zip.file(fileName, item.processed);
            }

            // 生成zip文件
            const content = await zip.generateAsync({type: 'blob'});
            
            // 下载文件
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            saveAs(content, `ImageCropPro_${timestamp}.zip`);

        } catch (error) {
            console.error('下载失败:', error);
            alert('下载失败，请重试！');
        }

        this.downloadBtn.disabled = false;
        this.downloadBtn.innerHTML = '<i class="fas fa-download"></i> 批量下载 (ZIP)';
    }

    getProcessedFileName(originalName) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        const format = this.formatSelect.value;
        const formatNames = {
            'a4': 'A4_竖版',
            'a4-landscape': 'A4_横版',
            'a3': 'A3_竖版',
            'a3-landscape': 'A3_横版',
            'a5': 'A5_竖版',
            'a5-landscape': 'A5_横版',
            'letter': 'Letter_竖版',
            'letter-landscape': 'Letter_横版',
            'square': 'Square',
            'custom': 'Custom'
        };
        return `${nameWithoutExt}_${formatNames[format] || 'Processed'}.jpg`;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageCropPro();
}); 