// --- DOM ELEMENTS ---
const screens = {
    welcome: document.getElementById('screen-welcome'),
    layout: document.getElementById('screen-layout'),
    capture: document.getElementById('screen-capture'),
    selection: document.getElementById('screen-selection'),
    final: document.getElementById('screen-final')
};

const video = document.getElementById('videoElement');
const cameraOverlay = document.getElementById('cameraOverlay');
const canvas = document.getElementById('canvasElement');
const ctx = canvas.getContext('2d');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const progressEl = document.getElementById('captureProgress');
const selectionContainer = document.getElementById('selectionContainer');
const btnConfirmSelection = document.getElementById('btnConfirmSelection');
const btnRetake = document.getElementById('btnRetake');
const btnStartCapture = document.getElementById('btnStartCapture');
const btnStart = document.getElementById('btnStart');

// --- APP STATE ---
let currentLayout = null; 
let capturedPhotos = []; 
let slotAssignments = []; 
let userSelectedIndices = [];

const LAYOUTS = [
    {
        id: 'frame-strip-bear',
        name: 'Khung Bé Gấu 5x16',
        requiredPhotos: 4,
        frameUrl: '/static/congau.png', // Hoạt động hoàn hảo với PNG
        overlayUrls: [
            '/static/overlays/bear/PoseBear1.png',
            '/static/overlays/bear/PoseBear2.png',
            '/static/overlays/bear/PoseBear3.png',
            '/static/overlays/bear/PoseBear4.png'
        ],

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
        overlayUrls: [
            '/static/overlays/boy/PoseBoy1.png',
            '/static/overlays/boy/PoseBoy2.png',
            '/static/overlays/boy/PoseBoy3.png',
            '/static/overlays/boy/PoseBoy4.png'
        ],
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
        overlayUrls: [
            '/static/overlays/knight/PoseKnight1.png',
            '/static/overlays/knight/PoseKnight2.png',
            '/static/overlays/knight/PoseKnight3.png',
            '/static/overlays/knight/PoseKnight4.png'
        ],
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
if (btnStartCapture) {
    btnStartCapture.addEventListener('click', () => {
        if (!currentLayout) return;
        startCaptureSession();
    });
}

// --- BƯỚC 2: CHỌN LAYOUT ---
// Hàm hiển thị danh sách Layout (Không cần lọc ngang/dọc nữa)
// Hàm hiển thị danh sách Layout (Đã thêm ảnh preview và sửa lỗi click)
// Hàm hiển thị danh sách Layout (Đã tối ưu chuẩn Form)
function renderLayoutOptions() {
    const container = document.getElementById('layoutContainer');
    container.innerHTML = '';
    if (btnStartCapture) btnStartCapture.classList.add('hidden');
    
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
        if (currentLayout && currentLayout.id === layout.id) {
            btn.classList.add('active');
            if (btnStartCapture) btnStartCapture.classList.remove('hidden');
        }

        btn.addEventListener('click', () => {
            currentLayout = layout;
            document.querySelectorAll('.layout-btn').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            if (btnStartCapture) btnStartCapture.classList.remove('hidden');
        });
        
        container.appendChild(btn);
    });
}
// Hàm switchScreen hỗ trợ ẩn/hiện mượt mà
function switchScreen(screenName) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        s.classList.remove('hidden');
    });
    screens[screenName].classList.add('active');
}

// --- BƯỚC 3: CHỤP SỰ KIỆN 6 TẤM ---
async function startCaptureSession() {
    switchScreen('capture');
    capturedPhotos = []; 

    if (currentLayout && currentLayout.overlayUrls && currentLayout.overlayUrls.length > 0) {
        cameraOverlay.classList.remove('hidden');
    } else {
        cameraOverlay.classList.add('hidden');
    }
    
    for (let i = 1; i <= 6; i++) {
        progressEl.innerText = `${i}/6`;
        countdownEl.classList.remove('hidden');
        
        if (currentLayout && currentLayout.overlayUrls && currentLayout.overlayUrls.length > 0) {
            const randomIndex = Math.floor(Math.random() * currentLayout.overlayUrls.length);
            cameraOverlay.src = currentLayout.overlayUrls[randomIndex];
        }
        
        for (let c = 3; c > 0; c--) {
            countdownEl.innerText = c;
            await delay(1000); 
        }
        
        countdownEl.classList.add('hidden');
        
        flashEl.classList.add('flash-active');
        setTimeout(() => flashEl.classList.remove('flash-active'), 150);

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

    cameraOverlay.classList.add('hidden');

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    buildSelectionGrid();
    switchScreen('selection');
}

// --- BƯỚC 4: LỰA CHỌN VÀ SẮP XẾP VÀO KHUNG (DRAG & DROP TÍCH HỢP) ---
// --- BƯỚC 4: CẬP NHẬT GIAO DIỆN KHUNG THEO LAYOUT KHÁCH CHỌN ---
function buildSelectionGrid() {
    const requiredCountEl = document.getElementById('requiredCount');
    if (requiredCountEl) {
        requiredCountEl.innerText = currentLayout.requiredPhotos;
    } else {
        console.warn("Element 'requiredCount' not found in the DOM.");
    }
    btnConfirmSelection.disabled = true;
    
    const poolLeft = document.getElementById('photoPoolLeft');
    const poolRight = document.getElementById('photoPoolRight');
    const stripContainer = document.getElementById('stripPreviewContainer');    

    poolLeft.innerHTML = '';
    poolRight.innerHTML = '';
    stripContainer.innerHTML = '';

    // ================= DÂN TRÍ ĐỔI KHUNG ĐỘNG TẠI ĐÂY =================
    if (currentLayout && currentLayout.frameUrl) {
        // Tự động lấy đường dẫn ảnh của Khung (congau.jpg, hiepsi.jpg,...) làm nền
        stripContainer.style.backgroundImage = `url('${currentLayout.frameUrl}')`;
        stripContainer.style.backgroundSize = '100% 100%'; // Ép hình nền vừa vặn khít khung
        stripContainer.style.backgroundRepeat = 'no-repeat';
        stripContainer.style.backgroundPosition = 'center';
        stripContainer.style.backgroundColor = 'transparent'; // Loại bỏ màu xanh cứng mặc định
    }
    // Tải ảnh khung để tính kích thước hiển thị tương tự màn final
    if (currentLayout && currentLayout.frameUrl) {
        const previewFrameImg = new Image();
        previewFrameImg.src = currentLayout.frameUrl;
        previewFrameImg.onload = () => {
            // Quy tắc hiển thị giống .canvas-container: max-width:90vw, max-height:50vh
            const maxW = window.innerWidth * 0.9;
            const maxH = window.innerHeight * 0.5;
            const naturalW = previewFrameImg.width;
            const naturalH = previewFrameImg.height;
            const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
            const displayW = Math.round(naturalW * scale);
            const displayH = Math.round(naturalH * scale);

            // Gán kích thước cho container hiển thị khung ở màn chọn ảnh
            stripContainer.style.width = displayW + 'px';
            stripContainer.style.height = displayH + 'px';
            stripContainer.style.backgroundSize = '100% 100%';

            // Tính phần nội dung (không tính padding) để đặt chiều cao các ô theo tỷ lệ slot
            const st = window.getComputedStyle(stripContainer);
            const padTop = parseFloat(st.paddingTop) || 0;
            const padBottom = parseFloat(st.paddingBottom) || 0;
            const padLeft = parseFloat(st.paddingLeft) || 0;
            const padRight = parseFloat(st.paddingRight) || 0;
            const contentW = displayW - padLeft - padRight;
            const contentH = displayH - padTop - padBottom;

                // Gán chiều cao từng ô theo cấu hình layout
                currentLayout.slots.forEach((cfg, i) => {
                    const slotEl = document.getElementById(`strip-slot-${i}`);
                    if (!slotEl) return;
                    // Chiều rộng ô theo tỷ lệ w của layout
                    slotEl.style.width = (cfg.w * 100) + '%';
                    // Chiều cao ô theo tỷ lệ h của layout
                    slotEl.style.height = (cfg.h * 100) + '%';
                    slotEl.style.margin = '6px auto';
                    slotEl.style.display = 'flex';
                });
        };
    }
    // =================================================================

    // Khởi tạo mảng gán vị trí ảnh
    slotAssignments = new Array(currentLayout.slots.length).fill(null);

    // 1. Dựng danh sách 6 ảnh đã chụp vào 2 cột (Draggable Source)
    capturedPhotos.forEach((photoDataUrl, index) => {
        const item = document.createElement('div');
        item.className = 'pool-item';
        item.draggable = true; // Bật tính năng Kéo Thả HTML5
        item.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = photoDataUrl;
        item.appendChild(img);
        
        // --- LOGIC KÉO THẢ (DRAG) ---
        item.addEventListener('dragstart', (e) => {
            item.classList.add('dragging');
            // Đóng gói số thứ tự của bức ảnh để gửi đi
            e.dataTransfer.setData('text/plain', index); 
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        // --- LOGIC CLICK (Dự phòng cho Mobile) ---
        item.onclick = () => {
            const isAlreadySelected = slotAssignments.includes(index);
            const firstEmptySlotIndex = slotAssignments.indexOf(null);

            if (isAlreadySelected) {
                const slotIndex = slotAssignments.indexOf(index);
                slotAssignments[slotIndex] = null;
                item.classList.remove('selected');
            } else if (firstEmptySlotIndex !== -1) {
                slotAssignments[firstEmptySlotIndex] = index;
                item.classList.add('selected');
            }
            updateStripVisuals();
        };

        if (index < 3) poolLeft.appendChild(item);
        else poolRight.appendChild(item);
    });

    // 2. Dựng dải Strip với các Ô (Drop Targets) theo tỉ lệ trong layout
    currentLayout.slots.forEach((cfg, index) => {
        const slotEl = document.createElement('div');
        slotEl.className = 'strip-slot';
        slotEl.innerText = "Ô ghép " + (index + 1);
        slotEl.id = `strip-slot-${index}`;

        // Đặt vị trí và kích thước theo tỉ lệ trong `cfg` (sử dụng phần trăm)
        slotEl.style.position = 'absolute';
        slotEl.style.left = (cfg.cx * 100) + '%';
        slotEl.style.top = (cfg.cy * 100) + '%';
        slotEl.style.width = (cfg.w * 100) + '%';
        slotEl.style.height = (cfg.h * 100) + '%';
        slotEl.style.transform = `translate(-50%,-50%) rotate(${cfg.angle || 0}deg)`;
        slotEl.style.boxSizing = 'border-box';

        // --- LOGIC THẢ (DROP) ---
        // Cho phép vật thể bay lơ lửng bên trên (bắt buộc phải có để Drop hoạt động)
        slotEl.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            slotEl.classList.add('drag-over');
        });

        // Hủy hiệu ứng hover khi kéo chuột ra khỏi ô
        slotEl.addEventListener('dragleave', () => {
            slotEl.classList.remove('drag-over');
        });

        // Khi người dùng buông chuột thả ảnh vào ô
        slotEl.addEventListener('drop', (e) => {
            e.preventDefault();
            slotEl.classList.remove('drag-over');
            
            // Giải nén dữ liệu: Lấy số thứ tự bức ảnh vừa được ném vào
            const draggedPhotoIndex = parseInt(e.dataTransfer.getData('text/plain'));

            if (!isNaN(draggedPhotoIndex)) {
                // Nếu ảnh này đang nằm ở ô khác, phải tháo nó ra khỏi ô cũ trước
                const oldSlotIndex = slotAssignments.indexOf(draggedPhotoIndex);
                if (oldSlotIndex !== -1) {
                    slotAssignments[oldSlotIndex] = null;
                }
                
                // Gán ảnh vào ô mới này
                slotAssignments[index] = draggedPhotoIndex;
                updateStripVisuals();
            }
        });

        // --- LOGIC CLICK VÀO Ô ĐỎ ĐỂ GỠ ẢNH ---
        slotEl.onclick = () => {
            const photoIndex = slotAssignments[index];
            if (photoIndex !== null) {
                slotAssignments[index] = null;
                document.querySelectorAll('.pool-item')[photoIndex].classList.remove('selected');
                updateStripVisuals();
            }
        };
        
        stripContainer.appendChild(slotEl);
    });
}

// Hàm cập nhật giao diện trực quan (Không đổi)
function updateStripVisuals() {
    // Dọn sạch class selected ở tất cả các ảnh trước
    document.querySelectorAll('.pool-item').forEach(item => item.classList.remove('selected'));

    slotAssignments.forEach((photoIndex, slotIndex) => {
        const slotEl = document.getElementById(`strip-slot-${slotIndex}`);
        
        // Dọn dẹp ảnh cũ trong ô
        const existingImg = slotEl.querySelector('img');
        if (existingImg) existingImg.remove();

        // Nếu ô đó đang được gán ảnh thì hiển thị lên
        if (photoIndex !== null) {
            const img = document.createElement('img');
            img.src = capturedPhotos[photoIndex];
            slotEl.appendChild(img);
            
            // Bôi mờ bức ảnh ở 2 cột để báo hiệu nó đã được dùng
            document.querySelectorAll('.pool-item')[photoIndex].classList.add('selected');
        }
    });

    // Nếu mảng không còn slot nào null (đã chọn đủ) -> Mở khóa nút Hoàn Thành
    btnConfirmSelection.disabled = slotAssignments.includes(null);
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

// --- BƯỚC 5: XỬ LÝ GHÉP FRAME VÀ HIỂN THỊ (DÀNH CHO KHUNG ĐƠN PNG) ---
btnConfirmSelection.addEventListener('click', () => {
    // 1. Kiểm tra xem đã điền đủ các ô chưa
    const isFull = slotAssignments.every(slot => slot !== null);
    if (!isFull) {
        alert("Bạn hãy kéo thả ảnh vào đầy đủ các ô nhé!");
        return;
    }

    // 2. Lưu lại danh sách chỉ mục ảnh đã chọn
    userSelectedIndices = slotAssignments.slice();
    
    // 3. Chuyển màn hình
    switchScreen('final');
    
    const frameImg = new Image();
    frameImg.src = currentLayout.frameUrl; 
    
    frameImg.onload = () => {
        const canvas = document.getElementById('canvasElement');
        const ctx = canvas.getContext('2d');
        canvas.width = frameImg.width;
        canvas.height = frameImg.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Lớp nền trắng
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let loadedCount = 0;
        
        // Vẽ đúng ảnh mà khách đã gán vào từng slot
        currentLayout.slots.forEach((config, i) => {
            let selectedPhotoIndex = slotAssignments[i];
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
                drawImageProp(ctx, photoImg, -slotW / 2, -slotH / 2, slotW, slotH);
                ctx.restore();
                
                loadedCount++;
                
                // Khi vẽ xong tất cả slot, ụp cái khung PNG (nền trong suốt) lên trên cùng!
                if (loadedCount === currentLayout.slots.length) {
                    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
                }
            };
        });
    };
});

// NÚT LƯU ẢNH: Vừa tải trực tiếp về máy vừa gửi bản sao lên server Flask (Đã sửa lỗi & Tối ưu Mobile)
const btnSave = document.getElementById('btnSave');
if (btnSave) {
    btnSave.addEventListener('click', () => {
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        
        // 1. Download client-side về máy tính/điện thoại người dùng
        const link = document.createElement('a');
        link.download = `photobooth_${currentLayout ? currentLayout.id : 'photo'}_${new Date().getTime()}.jpg`;
        link.href = dataURL;
        
        // Mẹo bắt buộc: Phải append vào body thì Safari/Chrome trên điện thoại mới chịu tải file xuống
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 2. Đồng thời gửi ngầm về server Python Flask để lưu giữ lưu trữ dự phòng
        fetch('/save-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataURL })
        })
        .then(response => response.json())
        .then(data => console.log("Đã lưu dự phòng tại server:", data.message))
        .catch(error => console.error('Lỗi lưu server:', error));
    });
}
