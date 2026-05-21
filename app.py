from flask import Flask, render_template
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Render sẽ tự động gán Port môi trường, nếu không có thì dùng 5000
    port = int(os.environ.get('PORT', 5000))
    # Bỏ ssl_context='adhoc' và debug=True
    app.run(host='0.0.0.0', port=port)