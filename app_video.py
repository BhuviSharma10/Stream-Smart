import os
import eventlet
from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import random
import string

app = Flask(__name__, static_folder='.')
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-here'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Store active rooms and their participants
rooms = {}  # {room_code: {'host': sid, 'participants': [sids], 'streams': {}}

@app.route('/')
def index():
    return send_from_directory('.', 'video_conference.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# Generate random room code
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
        
        # Notify everyone in room
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

# WebRTC Signaling
@socketio.on('offer')
def handle_offer(data):
    room_code = data['room_code']
    emit('offer', {
        'offer': data['offer'],
        'from': request.sid
    }, room=room_code, skip_sid=request.sid)

@socketio.on('answer')
def handle_answer(data):
    room_code = data['room_code']
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

# Delta compression simulation (for bandwidth optimization)
@socketio.on('update_bandwidth')
def handle_bandwidth_update(data):
    room_code = data['room_code']
    bandwidth = data['bandwidth']
    
    # Calculate delta compression level based on bandwidth
    if bandwidth > 3.0:
        quality = 'high'
        compression = 0  # 0% compression
    elif bandwidth > 1.0:
        quality = 'medium'
        compression = 50  # 50% compression
    else:
        quality = 'low'
        compression = 70  # 70% compression (delta streaming)
    
    emit('quality_update', {
        'quality': quality,
        'compression': compression,
        'mode': 'delta' if compression > 50 else 'normal'
    }, room=room_code)

@socketio.on('disconnect')
def handle_disconnect():
    # Remove user from rooms
    for room_code, room_data in list(rooms.items()):
        if request.sid in room_data['participants']:
            room_data['participants'].remove(request.sid)
            
            # If host left, delete room or assign new host
            if room_data['host'] == request.sid and room_data['participants']:
                room_data['host'] = room_data['participants'][0]
                emit('host_changed', {'new_host': room_data['host']}, room=room_code)
            elif not room_data['participants']:
                del rooms[room_code]
            
            emit('user_left', {
                'participant_count': len(room_data['participants'])
            }, room=room_code)
            break

if __name__ == '__main__':
    print("Video Conference Server Starting...")
    print("Open http://127.0.0.1:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)