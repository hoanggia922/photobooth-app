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

const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const progressEl = document.getElementById('captureProgress');
const selectionContainer = document.getElementById('selectionContainer');
const btnConfirmSelection = document.getElementById('btnConfirmSelection');

// --- APP STATE (TRẠNG THÁI) ---
let currentLayout = null; // Layout người dùng chọn
let capturedPhotos = []; // Lưu 6 bức ảnh đã chụp (dạng DataURL)
let userSelectedIndices = []; // Lưu vị trí các ảnh user tick chọn (VD: [0, 2, 5])

// CẤU HÌNH CÁC LAYOUT (Bạn cần tự chỉnh sửa tọa độ cx, cy, w, h cho khớp với frame thật của bạn)
const LAYOUTS = [
    {
        id: 'layout-2',
        name: 'Frame 2 Ảnh',
        requiredPhotos: 2,
        frameUrl: '/static/frame_2.png', // Hãy lưu khung nền đen tên là frame_2.png
        slots: [
            { cx: 0.25, cy: 0.43, w: 0.42, h: 0.76, angle: 0 }, // Ô bên trái
            { cx: 0.75, cy: 0.43, w: 0.42, h: 0.76, angle: 0 }  // Ô bên phải
        ]
    },
    {
        id: 'layout-3',
        name: 'Frame 3 Ảnh',
        requiredPhotos: 3,
        frameUrl: '/static/frame_3.png', // Hãy lưu khung dọc 3 ô tên là frame_3.png
        slots: [
            { cx: 0.47, cy: 0.18, w: 0.85, h: 0.33, angle: 0 }, // Ô trên cùng
            { cx: 0.47, cy: 0.51, w: 0.85, h: 0.33, angle: 0 }, // Ô ở giữa
            { cx: 0.47, cy: 0.84, w: 0.85, h: 0.33, angle: 0 }  // Ô dưới cùng
        ]
    },
    {
        id: 'layout-4',
        name: 'Frame 4 Ảnh',
        requiredPhotos: 4,
        frameUrl: '/static/frame_4.png', // Thay bằng file frame 2x2 của bạn
        slots: [
            { cx: 0.26, cy: 0.29, w: 0.47, h: 0.40, angle: 0 },
            { cx: 0.74, cy: 0.29, w: 0.47, h: 0.40, angle: 0 },
            { cx: 0.26, cy: 0.71, w: 0.47, h: 0.40, angle: 0 },
            { cx: 0.74, cy: 0.71, w: 0.47, h: 0.40, angle: 0 }
        ]
    }
];

// Hàm chuyển màn hình
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// --- BƯỚC 1: XIN QUYỀN VÀ MỞ CAMERA ---
document.getElementById('btnStart').addEventListener('click', async () => {
    try {
        let stream;
        try {
            // PHƯƠNG ÁN A: Thử mở Camera trước chuẩn HD (Điện thoại)
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
        } catch (errA) {
            // PHƯƠNG ÁN B: Nếu PC/Laptop không hiểu "facingMode", mở camera mặc định
            stream = await navigator.mediaDevices.getUserMedia({
                video: true, audio: false
            });
        }

        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play().catch(e => console.log("Bỏ qua lỗi play:", e));
        };
        
        buildLayoutMenu();
        showScreen('layout'); // Chuyển sang màn hình chọn Layout
    } catch (err) {
        alert("Lỗi Camera: Không thể truy cập. " + err.message);
    }
});

// --- BƯỚC 2: CHỌN LAYOUT ---
function buildLayoutMenu() {
    const container = document.getElementById('layoutContainer');
    container.innerHTML = '';
    LAYOUTS.forEach(layout => {
        const btn = document.createElement('button');
        btn.className = 'layout-btn';
        btn.innerText = `Chụp ${layout.requiredPhotos} Ảnh (Khung ${layout.name})`;
        btn.onclick = () => {
            currentLayout = layout;
            startCaptureSession();
        };
        container.appendChild(btn);
    });
}

// --- BƯỚC 3: QUÁ TRÌNH CHỤP 6 ẢNH ---
async function startCaptureSession() {
    showScreen('capture');
    capturedPhotos = []; // Reset ảnh cũ
    
    // Luôn luôn chụp 6 kiểu
    for (let i = 1; i <= 6; i++) {
        progressEl.innerText = `${i}/6`;
        countdownEl.classList.remove('hidden');
        
        for (let c = 3; c > 0; c--) {
            countdownEl.innerText = c;
            await delay(1000); 
        }
        
        countdownEl.classList.add('hidden');
        
        // Nháy Flash
        flashEl.classList.add('flash-active');
        setTimeout(() => flashEl.classList.remove('flash-active'), 50);

        // Lưu frame hiện tại vào Canvas Ẩn để lấy DataURL
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tCtx = tempCanvas.getContext('2d');
        
        // Lật ngược (Mirror) khung vẽ trước khi dán hình từ camera vào
        tCtx.translate(tempCanvas.width, 0);
        tCtx.scale(-1, 1);
        tCtx.drawImage(video, 0, 0);
        
        capturedPhotos.push(tempCanvas.toDataURL('image/jpeg', 0.8));
        // ==================================================

        await delay(500); // Nghỉ 0.5s trước tấm tiếp theo
    }

    buildSelectionGrid();
    showScreen('selection');
}

// --- BƯỚC 4: CHỌN ẢNH ƯNG Ý ---
function buildSelectionGrid() {
    userSelectedIndices = []; // Reset danh sách chọn
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
                // Bỏ chọn
                userSelectedIndices = userSelectedIndices.filter(i => i !== index);
                item.classList.remove('selected');
            } else {
                // Thêm chọn (Nếu chưa đủ số lượng yêu cầu)
                if (userSelectedIndices.length < currentLayout.requiredPhotos) {
                    userSelectedIndices.push(index);
                    item.classList.add('selected');
                }
            }
            
            // Kích hoạt nút Hoàn thành nếu chọn đủ
            btnConfirmSelection.disabled = userSelectedIndices.length !== currentLayout.requiredPhotos;
        };
        selectionContainer.appendChild(item);
    });
}

// Hàm vẽ giữ tỷ lệ ảnh (Mô phỏng object-fit: cover)
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

// --- BƯỚC 5: GHÉP FRAME VÀ LƯU KẾT QUẢ ---
btnConfirmSelection.addEventListener('click', () => {
    showScreen('final');
    
    const frameImg = new Image();
    frameImg.src = currentLayout.frameUrl; 
    
    frameImg.onload = () => {
        canvas.width = frameImg.width;
        canvas.height = frameImg.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Duyệt qua các tọa độ slot của Layout
        currentLayout.slots.forEach((config, i) => {
            // Lấy index ảnh người dùng đã chọn tương ứng với slot này
            let selectedPhotoIndex = userSelectedIndices[i];
            
            let photoImg = new Image();
            photoImg.src = capturedPhotos[selectedPhotoIndex];
            
            // Vì load ảnh từ DataURL tốn vài mili-giây, cần nhúng onload để vẽ đồng bộ
            photoImg.onload = () => {
                let slotCX = config.cx * canvas.width;
                let slotCY = config.cy * canvas.height;
                let slotW = config.w * canvas.width;
                let slotH = config.h * canvas.height;
                let radians = config.angle * Math.PI / 180;

                ctx.save();
                ctx.translate(slotCX, slotCY);
                ctx.rotate(radians);
                drawImageProp(ctx, photoImg, -slotW / 2, -slotH / 2, slotW, slotH);
                ctx.restore();
                
                // Nếu là slot cuối cùng, vẽ đè cái Frame rỗng lên che mép
                if (i === currentLayout.slots.length - 1) {
                    // Timeout nhỏ để đảm bảo ảnh slot cuối cùng đã được vẽ xong
                    setTimeout(() => {
                        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
                    }, 50);
                }
            };
        });
    };
});

// Nút chụp lại
document.getElementById('btnRetake').addEventListener('click', () => {
    showScreen('layout'); // Quay lại bước chọn layout
});

// Nút lưu ảnh
document.getElementById('btnSave').addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.download = `photobooth_${currentLayout.id}.jpg`;
    link.href = dataURL;
    link.click();
});