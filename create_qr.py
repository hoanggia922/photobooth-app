import qrcode
import socket

def get_local_ip():
    """Hàm tự động lấy địa chỉ IPv4 của máy tính trong mạng LAN"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Không cần kết nối internet thực sự, chỉ để mượn route xác định IP LAN
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

if __name__ == "__main__":
    # Lấy IP và tạo URL cho server Flask (nhớ là https vì dùng ssl_context='adhoc')
    ip = get_local_ip()
    url = f"https://{ip}:5000"
    
    print(f"🔗 Đang tạo QR Code cho địa chỉ: {url}")
    
    # Cấu hình mã QR
    qr = qrcode.QRCode(
        version=1, 
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10, 
        border=4
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    # Xuất ra file ảnh
    img = qr.make_image(fill_color="black", back_color="white")
    filename = "scan_me.png"
    img.save(filename)
    
    print(f"✅ Đã tạo thành công file '{filename}' trong thư mục dự án.")
    print("👉 Hãy mở file ảnh này trên máy tính và dùng Camera điện thoại để quét!")