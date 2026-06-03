// --- DOM ELEMENTS ---
const screens = {
    welcome: document.getElementById('screen-welcome'),
    layout: document.getElementById('screen-layout'),
    capture: document.getElementById('screen-capture'),
    selection: document.getElementById('screen-selection'),
    final: document.getElementById('screen-final')
};

const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const ctx = canvas.getContext('2d');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const progressEl = document.getElementById('captureProgress');
const selectionContainer = document.getElementById('selectionContainer');
const btnConfirmSelection = document.getElementById('btnConfirmSelection');
const btnRetake = document.getElementById('btnRetake');
const btnStart = document.getElementById('btnStart');

// --- APP STATE ---
let currentLayout = null; 
let capturedPhotos = []; 
let userSelectedIndices = []; 

const LAYOUTS = [
    {
        id: 'frame-strip-bear',
        name: 'Khung Bé Gấu 5x16',
        requiredPhotos: 4,
        frameUrl: '/static/congau.png', // Hoạt động hoàn hảo với PNG
        slots: [
            // Ô 1 (Trên cùng) - Đã được kéo lên đúng vị trí
            { cx: 0.5, cy: 0.1122, w: 0.9171, h: 0.1852, angle: 0 },
            // Ô 2
            { cx: 0.5, cy: 0.3183, w: 0.9154, h: 0.1857, angle: 0 },
            // Ô 3 
            { cx: 0.5, cy: 0.5241, w: 0.9205, h: 0.1857, angle: 0 },
            // Ô 4 (Dưới cùng)
            { cx: 0.5, cy: 0.7304, w: 0.9154, h: 0.1868, angle: 0 }
        ]
    },
    {
        id: 'frame-strip-boy',
        name: 'Khung Bé Trai 5x16',
        requiredPhotos: 4,
        frameUrl: '/static/final.png',
        slots: [
            { cx: 0.5, cy: 0.1122, w: 0.9171, h: 0.1852, angle: 0 },
            { cx: 0.5, cy: 0.3183, w: 0.9154, h: 0.1857, angle: 0 },
            { cx: 0.5, cy: 0.5241, w: 0.9205, h: 0.1857, angle: 0 },
            { cx: 0.5, cy: 0.7304, w: 0.9154, h: 0.1868, angle: 0 }
        ]
    },
    {
        id: 'frame-strip-knight',
        name: 'Khung Hiệp Sĩ 5x16',
        requiredPhotos: 4,
        frameUrl: '/static/hiepsi.png',
        slots: [
            { cx: 0.5, cy: 0.1122, w: 0.9171, h: 0.1852, angle: 0 },
            { cx: 0.5, cy: 0.3183, w: 0.9154, h: 0.1857, angle: 0 },
            { cx: 0.5, cy: 0.5241, w: 0.9205, h: 0.1857, angle: 0 },
            { cx: 0.5, cy: 0.7304, w: 0.9154, h: 0.1868, angle: 0 }
        ]
    }
];

// --- BƯỚC 1: BẤM START -> MỞ CAMERA -> CHỌN LAYOUT ---
function startCameraSessionGlobal() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play().catch(err => console.warn('Lỗi autoplay video:', err));
            renderLayoutOptions();
            switchScreen('layout');
        })
        .catch(err => {
            console.error("Lỗi camera: ", err);
            alert("Vui lòng cấp quyền camera trên trình duyệt để tiếp tục!");
        });
}

btnStart.addEventListener('click', startCameraSessionGlobal);
if (btnRetake) {
    btnRetake.addEventListener('click', startCameraSessionGlobal);
}

// --- BƯỚC 2: CHỌN LAYOUT ---
// Hàm hiển thị danh sách Layout (Không cần lọc ngang/dọc nữa)
// Hàm hiển thị danh sách Layout (Đã thêm ảnh preview và sửa lỗi click)
// Hàm hiển thị danh sách Layout (Đã tối ưu chuẩn Form)
function renderLayoutOptions() {
    const container = document.getElementById('layoutContainer');
    container.innerHTML = '';
    
    LAYOUTS.forEach(layout => {
        const btn = document.createElement('button');
        btn.className = 'layout-btn';

        const previewContainer = document.createElement('div');
        previewContainer.className = 'layout-preview-strip';

        // 1. Xếp các ô đen làm nền phía dưới trước
        layout.slots.forEach(slot => {
            const slotEl = document.createElement('div');
            slotEl.className = 'slot-overlay-preview';
            slotEl.style.left = `${(slot.cx - slot.w / 2) * 100}%`;
            slotEl.style.top = `${(slot.cy - slot.h / 2) * 100}%`;
            slotEl.style.width = `${slot.w * 100}%`;
            slotEl.style.height = `${slot.h * 100}%`;
            slotEl.style.transform = `rotate(${slot.angle || 0}deg)`;
            previewContainer.appendChild(slotEl);
        });

        // 2. Đặt ảnh khung PNG lên trên cùng
        const frameImg = document.createElement('img');
        frameImg.src = layout.frameUrl;
        frameImg.alt = layout.name;
        frameImg.className = 'frame-img-preview';
        previewContainer.appendChild(frameImg);

        btn.appendChild(previewContainer);

        const nameEl = document.createElement('div');
        nameEl.className = 'layout-name-overlay';
        nameEl.innerText = layout.name;
        btn.appendChild(nameEl);

        btn.addEventListener('click', (e) => {
            e.currentTarget.disabled = true;
            currentLayout = layout;
            startCaptureSession();
        });
        
        container.appendChild(btn);
    });
}
// Hàm switchScreen hỗ trợ ẩn/hiện mượt mà
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// --- BƯỚC 3: CHỤP SỰ KIỆN 6 TẤM ---
async function startCaptureSession() {
    switchScreen('capture');
    capturedPhotos = []; 
    
    for (let i = 1; i <= 6; i++) {
        progressEl.innerText = `${i}/6`;
        countdownEl.classList.remove('hidden');
        
        for (let c = 3; c > 0; c--) {
            countdownEl.innerText = c;
            await delay(1000); 
        }
        
        countdownEl.classList.add('hidden');
        
        flashEl.classList.add('flash-active');
setTimeout(() => flashEl.classList.remove('flash-active'), 150); // Đổi từ 50 thành 150

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tCtx = tempCanvas.getContext('2d');
        
        tCtx.translate(tempCanvas.width, 0);
        tCtx.scale(-1, 1);
        tCtx.drawImage(video, 0, 0);
        
        capturedPhotos.push(tempCanvas.toDataURL('image/jpeg', 0.8));

        await delay(500); 
    }

    // Tắt luồng camera sau khi chụp xong 6 tấm để bảo vệ tài nguyên
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    buildSelectionGrid();
    switchScreen('selection');
}

// --- BƯỚC 4: LỰA CHỌN GRID ---
function buildSelectionGrid() {
    userSelectedIndices = []; 
    document.getElementById('requiredCount').innerText = currentLayout.requiredPhotos;
    btnConfirmSelection.disabled = true;
    selectionContainer.innerHTML = '';

    capturedPhotos.forEach((photoDataUrl, index) => {
        const item = document.createElement('div');
        item.className = 'selection-item';
        item.innerHTML = `<img src="${photoDataUrl}">`;
        
        item.onclick = () => {
            const isSelected = userSelectedIndices.includes(index);
            if (isSelected) {
                userSelectedIndices = userSelectedIndices.filter(i => i !== index);
                item.classList.remove('selected');
            } else {
                if (userSelectedIndices.length < currentLayout.requiredPhotos) {
                    userSelectedIndices.push(index);
                    item.classList.add('selected');
                }
            }
            btnConfirmSelection.disabled = userSelectedIndices.length !== currentLayout.requiredPhotos;
        };
        selectionContainer.appendChild(item);
    });
}

function drawImageProp(ctx, img, x, y, w, h) {
    let imgRatio = img.width / img.height, slotRatio = w / h;
    let sx, sy, sWidth, sHeight;
    if (imgRatio > slotRatio) {
        sHeight = img.height; sWidth = sHeight * slotRatio;
        sx = (img.width - sWidth) / 2; sy = 0;
    } else {
        sWidth = img.width; sHeight = sWidth / slotRatio;
        sx = 0; sy = (img.height - sHeight) / 2;
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

// --- BƯỚC 5: XỬ LÝ GHÉP FRAME VÀ HIỂN THỊ (AN TOÀN CHUẨN XÁC CHO FILE JPG) ---
btnConfirmSelection.addEventListener('click', () => {
    switchScreen('final');
    
    const frameImg = new Image();
    frameImg.src = currentLayout.frameUrl; 
    
    frameImg.onload = () => {
        const canvas = document.getElementById('canvasElement');
        const ctx = canvas.getContext('2d');
        canvas.width = frameImg.width;
        canvas.height = frameImg.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. VẼ TẤM KHUNG GỐC XUỐNG DƯỚI CÙNG LÀM NỀN TRƯỚC
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

        let loadedCount = 0;
        const slotsToDraw = currentLayout.slots.slice(0, currentLayout.requiredPhotos);
        
        // 2. VẼ ẢNH KHÁCH CHỤP ĐÈ LÊN TRÊN CÁC Ô ĐEN CỦA KHUNG NỀN
        slotsToDraw.forEach((config, i) => {
            let selectedPhotoIndex = userSelectedIndices[i];
            let photoImg = new Image();
            photoImg.src = capturedPhotos[selectedPhotoIndex];
            
            photoImg.onload = () => {
                let slotCX = config.cx * canvas.width;
                let slotCY = config.cy * canvas.height;
                let slotW = config.w * canvas.width;
                let slotH = config.h * canvas.height;
                let radians = (config.angle || 0) * Math.PI / 180;

                ctx.save();
                ctx.translate(slotCX, slotCY);
                ctx.rotate(radians);
                
                // Cắt và dán ảnh của khách đè lên trên khung
                drawImageProp(ctx, photoImg, -slotW / 2, -slotH / 2, slotW, slotH);
                ctx.restore();
                
                loadedCount++;
                if (loadedCount === slotsToDraw.length) {
                    console.log("Đã ghép xong 4 ảnh lên khung!");
                }
            };
        });
    };
});
