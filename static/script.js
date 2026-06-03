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

// --- APP STATE ---
let currentLayout = null; 
let capturedPhotos = []; 
let userSelectedIndices = []; 

const LAYOUTS = [
    {
        id: 'frame-bear',
        name: 'Khung Bé Gấu',
        requiredPhotos: 4,
        frameUrl: '/static/congau.png', 
        slots: [
            { cx: 0.5, cy: 0.16, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.36, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.56, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.76, w: 0.88, h: 0.18, angle: 0 }
        ]
    },
    {
        id: 'frame-boy',
        name: 'Khung Bé Trai',
        requiredPhotos: 4,
        frameUrl: '/static/final.png',
        slots: [
            { cx: 0.5, cy: 0.16, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.36, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.56, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.76, w: 0.88, h: 0.18, angle: 0 }
        ]
    },
    {
        id: 'frame-knight',
        name: 'Khung Hiệp Sĩ',
        requiredPhotos: 4,
        frameUrl: '/static/hiepsi.png',
        slots: [
            { cx: 0.5, cy: 0.16, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.36, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.56, w: 0.88, h: 0.18, angle: 0 },
            { cx: 0.5, cy: 0.76, w: 0.88, h: 0.18, angle: 0 }
        ]
    }
];

// --- BƯỚC 1: BẤM START -> MỞ CAMERA -> CHỌN LAYOUT ---
document.getElementById('btnStart').addEventListener('click', () => {
    // Xin quyền và bật webcam ngay lập tức
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            // Camera đã lên hình, đổ danh sách layout và chuyển màn hình
            renderLayoutOptions();
            switchScreen('layout');
        })
        .catch(err => {
            console.error("Lỗi camera: ", err);
            alert("Vui lòng cấp quyền camera trên trình duyệt để tiếp tục!");
        });
});

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
        
        // Sử dụng innerHTML để code ngắn gọn, chèn trực tiếp biến từ mảng LAYOUTS
        btn.innerHTML = `
            <img src="${layout.frameUrl}" alt="${layout.name}" class="layout-preview">
            <span class="layout-name">${layout.name}</span>
        `;
        
        // Xử lý sự kiện click chọn khung
        btn.addEventListener('click', (e) => {
            // 1. Khóa nút ngay lập tức để tránh khách lỡ tay nhấp đúp làm lỗi luồng
            e.currentTarget.disabled = true; 
            
            // 2. Cập nhật Layout đang được chọn vào biến toàn cục
            currentLayout = layout; 
            
            // 3. Tiến hành vào thẳng màn hình đếm ngược chụp ảnh
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

// --- BƯỚC 5: XỬ LÝ GHÉP FRAME VÀ HIỂN THỊ ---
btnConfirmSelection.addEventListener('click', () => {
    switchScreen('final');
    
    const frameImg = new Image();
    frameImg.src = currentLayout.frameUrl; 
    
    frameImg.onload = () => {
        canvas.width = frameImg.width;
        canvas.height = frameImg.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. VẼ KHUNG JPG LÊN ĐẦU TIÊN (Làm lớp nền dưới cùng)
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

        // 2. SAU ĐÓ VẼ 4 ẢNH CỦA KHÁCH HÀNG ĐÈ LÊN CÁC Ô ĐEN
        currentLayout.slots.forEach((config, i) => {
            let selectedPhotoIndex = userSelectedIndices[i];
            let photoImg = new Image();
            photoImg.src = capturedPhotos[selectedPhotoIndex];
            
            photoImg.onload = () => {
                let slotCX = config.cx * canvas.width;
                let slotCY = config.cy * canvas.height;
                let slotW = config.w * canvas.width;
                let slotH = config.h * canvas.height;
                let radians = config.angle * Math.PI / 180;

                ctx.save();
                ctx.translate(slotCX, slotCY);
                ctx.rotate(radians);
                // Vẽ ảnh của khách hàng đè lên trên (sử dụng hàm cắt cúp chuẩn xác)
                drawImageProp(ctx, photoImg, -slotW / 2, -slotH / 2, slotW, slotH);
                ctx.restore();
            };
        });
    };
});

document.getElementById('btnRetake').addEventListener('click', () => {
    // Kích hoạt lại luồng camera khi chụp lại
    document.getElementById('btnStart').click();
});

// NÚT LƯU ẢNH: Vừa tải trực tiếp về máy vừa gửi bản sao lên server Flask
document.getElementById('btnSave').addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    
    // 1. Download client-side về máy tính/điện thoại người dùng
    const link = document.createElement('a');
    link.download = `photobooth_${currentLayout.id}_${new Date().getTime()}.jpg`;
    link.href = dataURL;
    link.click();

    // 2. Đồng thời gửi ngầm về server Python Flask để lưu giữ lưu trữ
    fetch('/save-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataURL })
    })
    .then(response => response.json())
    .then(data => console.log("Đã lưu dự phòng tại server:", data.message))
    .catch(error => console.error('Lỗi lưu server:', error));
});
