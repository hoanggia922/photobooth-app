// Các DOM Elements
const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const ctx = canvas.getContext('2d');

const videoContainer = document.getElementById('videoContainer');
const canvasContainer = document.getElementById('canvasContainer');
const captureControls = document.getElementById('captureControls');
const actionControls = document.getElementById('actionControls');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const saveBtn = document.getElementById('saveBtn');
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
// Hàm Helper: Đợi một khoảng thời gian (ms)
const delay = ms => new Promise(res => setTimeout(res, ms));
// Hàm khởi tạo Camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
    } catch (err) {
        alert("Vui lòng cho phép truy cập Camera!");
    }
}

// Hàm giả lập hiệu ứng nháy Flash
async function triggerFlash() {
    flashEl.classList.add('flash-active');
    await delay(50);
    flashEl.classList.remove('flash-active');
}

// Xử lý sự kiện "Chụp Ảnh"
captureBtn.addEventListener('click', async () => {
    if (!video.videoWidth) return;
    
    captureControls.style.display = 'none';
    let capturedPhotos = [];

    // Lặp 4 lần để chụp 4 bức ảnh
    for (let i = 0; i < 4; i++) {
        countdownEl.style.display = 'block';
        
        // Đếm ngược 3-2-1
        for (let c = 3; c > 0; c--) {
            countdownEl.innerText = c;
            await delay(1000); 
        }
        
        // Chụp!
        countdownEl.style.display = 'none';
        triggerFlash();
        
        // Lưu tạm khung hình hiện tại vào một Canvas ẩn
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        tempCanvas.getContext('2d').drawImage(video, 0, 0);
        
        capturedPhotos.push(tempCanvas);
        
        // Nghỉ nửa giây trước khi đếm ngược tấm tiếp theo
        await delay(500); 
    }

    // Xử lý ghép ảnh
    processFinalImage(capturedPhotos);
});

// Hàm mô phỏng "object-fit: cover" để ảnh không bị méo khi đưa vào khung chữ nhật
function drawImageProp(ctx, img, x, y, w, h) {
    let imgRatio = img.width / img.height;
    let slotRatio = w / h;
    let sx, sy, sWidth, sHeight;

    if (imgRatio > slotRatio) {
        sHeight = img.height;
        sWidth = sHeight * slotRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
    } else {
        sWidth = img.width;
        sHeight = sWidth / slotRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

// Xử lý dán 4 ảnh và dán Khung lên trên cùng
function processFinalImage(photos) {
    const frameImg = new Image();
    frameImg.src = FRAME_IMAGE_URL; 
    
    frameImg.onload = () => {
        // Set canvas chính bằng đúng kích thước gốc của frame.png
        canvas.width = frameImg.width;
        canvas.height = frameImg.height;

        /* ==============================================================
           CẤU HÌNH TỌA ĐỘ 4 Ô TRỐNG (Tính theo phần trăm của Frame)
           cx, cy: Tọa độ tâm (X, Y) của ô xám (tính từ 0.0 đến 1.0)
           w, h: Chiều rộng, chiều cao của ô xám (tính từ 0.0 đến 1.0)
           angle: Góc nghiêng (Độ), số dương là nghiêng phải, âm là trái
        ============================================================== */
        const SLOTS_CONFIG = [
            { cx: 0.26, cy: 0.29, w: 0.47, h: 0.40, angle: 0 }, // Ảnh 1: Trái - Trên
            { cx: 0.74, cy: 0.29, w: 0.47, h: 0.40, angle: 0 }, // Ảnh 2: Phải - Trên
            { cx: 0.26, cy: 0.71, w: 0.47, h: 0.40, angle: 0 }, // Ảnh 3: Trái - Dưới
            { cx: 0.74, cy: 0.71, w: 0.47, h: 0.40, angle: 0 }  // Ảnh 4: Phải - Dưới
        ];

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Duyệt qua 4 ảnh đã chụp và dán vào 4 slot
        photos.forEach((photo, index) => {
            let config = SLOTS_CONFIG[index];
            
            // Tính toán giá trị pixel thực tế
            let slotCX = config.cx * canvas.width;
            let slotCY = config.cy * canvas.height;
            let slotW = config.w * canvas.width;
            let slotH = config.h * canvas.height;
            let radians = config.angle * Math.PI / 180;

            ctx.save();
            // Dời tâm vẽ đến giữa ô xám và xoay
            ctx.translate(slotCX, slotCY);
            ctx.rotate(radians);
            
            // Vẽ ảnh, lùi lại phân nửa width/height để tâm ảnh nằm đúng trục (0,0)
            drawImageProp(ctx, photo, -slotW / 2, -slotH / 2, slotW, slotH);
            
            ctx.restore();
        });

        // Cuối cùng, ốp file Frame đục lỗ lên trên cùng để che các mép thừa
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

        // Cập nhật UI
        videoContainer.style.display = 'none';
        canvasContainer.style.display = 'block';
        actionControls.style.display = 'flex';
    };
}

// Xử lý sự kiện "Lưu Ảnh"
saveBtn.addEventListener('click', () => {
    // Xuất ảnh từ Canvas ra định dạng PNG
    const dataURL = canvas.toDataURL('image/png', 1.0);
    
    // Tạo thẻ <a> ẩn để kích hoạt tải xuống
    const link = document.createElement('a');
    link.download = 'my_photobooth_4shot.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Xử lý sự kiện "Chụp Lại"
retakeBtn.addEventListener('click', () => {
    // Xóa trắng canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Chuyển đổi UI về trạng thái ban đầu
    canvasContainer.style.display = 'none';
    actionControls.style.display = 'none';
    
    videoContainer.style.display = 'block';
    captureControls.style.display = 'flex';
});

// Chạy camera ngay khi load xong trang
window.addEventListener('load', startCamera);


// =======================================================
// CÔNG CỤ CĂN CHỈNH TỌA ĐỘ SIÊU TỐC (LIVE PREVIEW)
// Đổi biến này thành 'false' sau khi bạn đã căn chỉnh xong!
let isCalibrationMode = false; 
// =======================================================

function startLiveCalibration() {
    const frameImg = new Image();
    frameImg.src = FRAME_IMAGE_URL; 
    
    frameImg.onload = () => {
        // Đổi giao diện sang chế độ Canvas ngay lập tức
        //videoContainer.style.display = 'none';
        videoContainer.style.position = 'absolute';
        videoContainer.style.opacity = '0';
        videoContainer.style.pointerEvents = 'none';
        videoContainer.style.zIndex = '-1';

        captureControls.style.display = 'none';
        canvasContainer.style.display = 'block';

        canvas.width = frameImg.width;
        canvas.height = frameImg.height;

        function renderLoop() {
            if (!isCalibrationMode) return; // Dừng vòng lặp nếu tắt chế độ test

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            /* ==============================================================
           CẤU HÌNH TỌA ĐỘ CHO FRAME 2x2 (UNFOLD 2010TX)
        ============================================================== */
        const SLOTS_CONFIG = [
            { cx: 0.26, cy: 0.29, w: 0.47, h: 0.40, angle: 0 }, // Ảnh 1: Trái - Trên
            { cx: 0.74, cy: 0.29, w: 0.47, h: 0.40, angle: 0 }, // Ảnh 2: Phải - Trên
            { cx: 0.26, cy: 0.71, w: 0.47, h: 0.40, angle: 0 }, // Ảnh 3: Trái - Dưới
            { cx: 0.74, cy: 0.71, w: 0.47, h: 0.40, angle: 0 }  // Ảnh 4: Phải - Dưới
        ];

            // Dán thẳng Video vào 4 ô liên tục (60 FPS)
            SLOTS_CONFIG.forEach((config) => {
                let slotCX = config.cx * canvas.width;
                let slotCY = config.cy * canvas.height;
                let slotW = config.w * canvas.width;
                let slotH = config.h * canvas.height;
                let radians = config.angle * Math.PI / 180;

                ctx.save();
                ctx.translate(slotCX, slotCY);
                ctx.rotate(radians);
                
                // Dùng video thay vì photo
                drawImageProp(ctx, video, -slotW / 2, -slotH / 2, slotW, slotH); 
                
                ctx.restore();
            });

            // Phủ khung frame lên
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

            // Lặp lại liên tục theo frame rate của màn hình
            requestAnimationFrame(renderLoop);
        }
        
        // Chờ video sẵn sàng rồi mới chạy vòng lặp
        video.addEventListener('loadeddata', () => {
            renderLoop();
        });
    };
}

// Cập nhật lại sự kiện load trang
window.addEventListener('load', async () => {
    await startCamera();
    
    // Nếu bật cờ Calibration, tự động chạy chế độ căn chỉnh
    if (isCalibrationMode) {
        startLiveCalibration();
    }
});