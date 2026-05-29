from flask import Flask, render_template, request, jsonify
import base64
import os
import datetime

app = Flask(__name__)

# Đảm bảo thư mục lưu ảnh tồn tại
os.makedirs('static/photos', exist_ok=True)

@app.route('/save-photo', methods=['POST'])
def save_photo():
    data = request.json
    if 'image' in data:
        # Tách bỏ phần header của base64
        image_data = data['image'].split(',')[1] 
        
        # Lưu file ảnh
        filename = f"booth_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join('static', 'photos', filename)
        with open(filepath, "wb") as fh:
            fh.write(base64.b64decode(image_data))
            
        return jsonify({"status": "success", "message": "Đã lưu ảnh thành công!"})
    
    return jsonify({"status": "error", "message": "Không tìm thấy ảnh."}), 400
@app.route('/')
def home():
    return render_template('index.html')

# --- THÊM 2 ROUTE MỚI ---
@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')
if __name__ == '__main__':
    # host='0.0.0.0' cho phép các thiết bị cùng mạng LAN truy cập
    # port=5000 là cổng mặc định, bạn có thể đổi thành 8080 nếu muốn
    app.run(host='0.0.0.0', port=5000, ssl_context='adhoc', debug=True)