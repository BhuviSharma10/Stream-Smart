import os
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import whisper
import subprocess
import random
import string

# Create Flask app
app = Flask(__name__, static_folder='.')
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# SocketIO for video conference
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active rooms for video conference
rooms = {}

# ============ TRANSCRIPTION PART (Your existing code) ============
print("Loading Whisper model...")
model = whisper.load_model("base")
print("Model loaded. Server ready!")

# Serve frontend
@app.route('/')
def landing():
    return send_from_directory('.', 'landing.html')

@app.route('/main')
def main_app():
    return send_from_directory('.', 'index.html')

@app.route('/video_conference_page')
def video_conference_page():
    return send_from_directory('.', 'video_conference.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# Transcription endpoint
@app.route('/transcribe', methods=['POST'])
def transcribe():
    print("Received transcription request")
    
    if 'file' not in request.files:
        print("No file in request")
        return jsonify({'error': 'No file uploaded'}), 400

    uploaded_file = request.files['file']
    if uploaded_file.filename == '':
        print("Empty filename")
        return jsonify({'error': 'Empty filename'}), 400

    print(f"Processing file: {uploaded_file.filename}")
    
    suffix = os.path.splitext(uploaded_file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        uploaded_file.save(tmp.name)
        tmp_path = tmp.name

    audio_path = tmp_path
    
    try:
        if uploaded_file.filename.lower().endswith(('.mp4', '.mov', '.mkv', '.avi')):
            print("Video file detected, extracting audio...")
            audio_path = tmp_path + ".wav"
            
            try:
                subprocess.run([
                    r'C:\ffmpeg\ffmpeg\bin\ffmpeg.exe',
                    '-i', tmp_path, 
                    '-acodec', 'pcm_s16le', 
                    '-ar', '16000', 
                    '-ac', '1', 
                    audio_path, 
                    '-y'
                ], check=True, capture_output=True)
                print("Audio extracted successfully")
            except subprocess.CalledProcessError as e:
                print(f"FFmpeg error: {e}")
                audio_path = tmp_path
        
        print("Starting transcription...")
        result = model.transcribe(audio_path)
        transcript = result['text'].strip()
        print(f"Transcription complete: {len(transcript)} characters")
        
        return jsonify({'transcript': transcript})

    except Exception as e:
        print(f"Error during transcription: {str(e)}")
        return jsonify({'error': str(e)}), 500

    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            if audio_path != tmp_path and os.path.exists(audio_path):
                os.remove(audio_path)
        except:
            pass

# ============ VIDEO CONFERENCE PART (SocketIO routes) ============
def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@socketio.on('create_room')
def handle_create_room(data):
    room_code = generate_room_code()
    rooms[room_code] = {
        'host': request.sid,
        'participants': [request.sid],
        'streams': {}
    }
    join_room(room_code)
    emit('room_created', {
        'room_code': room_code,
        'is_host': True
    })
    print(f"Room created: {room_code} by {request.sid}")

@socketio.on('join_room')
def handle_join_room(data):
    room_code = data['room_code']
    if room_code in rooms:
        join_room(room_code)
        rooms[room_code]['participants'].append(request.sid)
        
        emit('user_joined', {
            'participant_count': len(rooms[room_code]['participants'])
        }, room=room_code)
        
        emit('room_joined', {
            'room_code': room_code,
            'is_host': False,
            'participant_count': len(rooms[room_code]['participants'])
        })
        print(f"User {request.sid} joined room {room_code}")
    else:
        emit('error', {'message': 'Room not found'})

@socketio.on('offer')
def handle_offer(data):
    room_code = data['room_code']
    emit('offer', {
        'offer': data['offer'],
        'from': request.sid
    }, room=room_code, skip_sid=request.sid)

@socketio.on('answer')
def handle_answer(data):
    emit('answer', {
        'answer': data['answer'],
        'from': request.sid
    }, to=data['to'])

@socketio.on('ice_candidate')
def handle_ice_candidate(data):
    room_code = data['room_code']
    emit('ice_candidate', {
        'candidate': data['candidate'],
        'from': request.sid
    }, room=room_code, skip_sid=request.sid)

@socketio.on('update_bandwidth')
def handle_bandwidth_update(data):
    room_code = data['room_code']
    bandwidth = data['bandwidth']
    
    if bandwidth > 3.0:
        quality = 'high'
        compression = 0
    elif bandwidth > 1.0:
        quality = 'medium'
        compression = 50
    else:
        quality = 'low'
        compression = 70
    
    emit('quality_update', {
        'quality': quality,
        'compression': compression,
        'mode': 'delta' if compression > 50 else 'normal'
    }, room=room_code)

@socketio.on('disconnect')
def handle_disconnect():
    for room_code, room_data in list(rooms.items()):
        if request.sid in room_data['participants']:
            room_data['participants'].remove(request.sid)
            
            if room_data['host'] == request.sid and room_data['participants']:
                room_data['host'] = room_data['participants'][0]
                emit('host_changed', {'new_host': room_data['host']}, room=room_code)
            elif not room_data['participants']:
                del rooms[room_code]
            
            emit('user_left', {
                'participant_count': len(room_data['participants'])
            }, room=room_code)
            break

# ============ RUN SERVER ============
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎥 StreamSmart Server - BOTH Features Running!")
    print("="*60)
    print("📍 Transcription: http://127.0.0.1:5000")
    print("📍 Video Conference: http://127.0.0.1:5000/video_conference_page")
    print("="*60)
    print("✅ Whisper Model Loaded")
    print("✅ SocketIO Ready for Video Conference")
    print("="*60 + "\n")
    
    socketio.run(app, host='127.0.0.1', port=5000, debug=True)
