// 路线页功能
class RoutePage {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        // 页面加载时不显示地图，等待AI处理结果
        this.mapInstance = null;

        // 预置欢迎语
        const routeBox = document.getElementById('route-chat-box');
        if (routeBox && !routeBox.dataset.prefilled) {
            CommonUtils.appendChatMessage(routeBox, '你好，告诉我起点终点，我可以为你制定骑行或跑步路线，快告诉我你的需求吧！', 'ai');
            routeBox.dataset.prefilled = '1';
        }
    }

    bindEvents() {
        // 路线生成按钮
        const generateRouteBtn = document.getElementById('generate-route-btn');
        if (generateRouteBtn) {
            generateRouteBtn.addEventListener('click', () => this.generateRouteWithAI());
        }
    }

    // 使用 BMapGL 在路线页绘制路线
    initRouteMapWithPoint(routeData) {
        try {
            if (!window.BMapGL) {
                document.getElementById('map').innerHTML = '地图脚本未加载。';
                return;
            }
            
            // 如果没有坐标数据，不显示地图
            if (!routeData || !Array.isArray(routeData.start) || !Array.isArray(routeData.end)) {
                document.getElementById('map').innerHTML = '等待AI生成路线坐标...';
                return;
            }
            
            // 如果地图已存在，先清除所有覆盖物
            if (this.mapInstance) {
                this.mapInstance.clearOverlays();
            } else {
                // 创建新地图实例
                this.mapInstance = new BMapGL.Map('map');
                this.mapInstance.enableScrollWheelZoom(true);
            }
            
            const map = this.mapInstance;
            
            // 使用传入的坐标数据
            const p1 = new BMapGL.Point(Number(routeData.start[0]), Number(routeData.start[1]));
            const p2 = new BMapGL.Point(Number(routeData.end[0]), Number(routeData.end[1]));
            
            map.centerAndZoom(p1, 16);

            // 自定义图标（根目录 point.png 通过 /assets 暴露）- 放大3倍
            const icon = new BMapGL.Icon('/assets/point.png', new BMapGL.Size(72, 72), {
                anchor: new BMapGL.Size(36, 36)
            });
            const m1 = new BMapGL.Marker(p1, { icon });
            const m2 = new BMapGL.Marker(p2, { icon });
            map.addOverlay(m1);
            map.addOverlay(m2);

            // 添加起点和终点标签
            const label1 = new BMapGL.Label('起点', {
                position: p1,
                offset: new BMapGL.Size(15, -30)
            });
            label1.setStyle({
                color: '#333',
                fontSize: '14px',
                backgroundColor: 'rgba(255,255,255,0.8)',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '2px 6px'
            });
            map.addOverlay(label1);

            const label2 = new BMapGL.Label('终点', {
                position: p2,
                offset: new BMapGL.Size(15, -30)
            });
            label2.setStyle({
                color: '#333',
                fontSize: '14px',
                backgroundColor: 'rgba(255,255,255,0.8)',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '2px 6px'
            });
            map.addOverlay(label2);

            // 如果提供了完整路径坐标数组（如 routeData.path 或 routeData.polyline 或 routeData.waypoints）则绘制折线
            let pathPoints = null;
            if (Array.isArray(routeData.path) && routeData.path.length > 1) {
                pathPoints = routeData.path;
            } else if (Array.isArray(routeData.polyline) && routeData.polyline.length > 1) {
                pathPoints = routeData.polyline;
            } else if (Array.isArray(routeData.waypoints) && routeData.waypoints.length > 1) {
                // waypoints 通常不含起终点，这里合并
                pathPoints = [routeData.start, ...routeData.waypoints, routeData.end];
            }

            if (Array.isArray(pathPoints) && pathPoints.length > 1) {
                const bmapPoints = pathPoints.map((pt) => new BMapGL.Point(Number(pt[0]), Number(pt[1])));
                const polyline = new BMapGL.Polyline(bmapPoints, {
                    strokeColor: '#2b78e4',
                    strokeWeight: 6,
                    strokeOpacity: 0.9
                });
                map.addOverlay(polyline);
                try {
                    map.setViewport(bmapPoints);
                } catch (e) {
                    // 兜底使用起终点
                    map.setViewport([p1, p2]);
                }
            } else {
                // 无完整路径时，尝试调用驾车检索；若不可用，则用直线连接
                if (BMapGL && typeof BMapGL.DrivingRoute === 'function') {
                    const driving = new BMapGL.DrivingRoute(map, {
                        renderOptions: { map, autoViewport: true }
                    });
                    driving.search(p1, p2);
                } else {
                    const straight = new BMapGL.Polyline([p1, p2], {
                        strokeColor: '#2b78e4',
                        strokeWeight: 4,
                        strokeOpacity: 0.7,
                        strokeStyle: 'dashed'
                    });
                    map.addOverlay(straight);
                    try {
                        map.setViewport([p1, p2]);
                    } catch (e) {
                        const cenLng = (p1.lng + p2.lng) / 2;
                        const cenLat = (p1.lat + p2.lat) / 2;
                        map.centerAndZoom(new BMapGL.Point(cenLng, cenLat), 17);
                    }
                }
            }
        } catch (e) {
            console.error('BMapGL init error:', e);
            document.getElementById('map').innerHTML = '地图加载失败。';
        }
    }

    // 生成路线描述
    async generateRouteWithAI() {
        const routeRequestInput = document.getElementById("route-request-input");
        const routeBox = document.getElementById('route-chat-box');
        const userRequest = routeRequestInput.value.trim();

        if (userRequest === "") return;

        // 用户消息
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-message user-message';
        userMsg.textContent = userRequest;
        routeBox.appendChild(userMsg);
        routeBox.scrollTop = routeBox.scrollHeight;
        routeRequestInput.value = '';

        // 思考中
        const thinking = document.createElement('div');
        thinking.className = 'chat-message ai-message';
        thinking.textContent = 'AI 正在思考中...';
        routeBox.appendChild(thinking);
        routeBox.scrollTop = routeBox.scrollHeight;

        try {
            // 获取当前健身状态
            const fitnessState = window.fitnessStateManager ? window.fitnessStateManager.state : {};
            
            // 第一步：AI生成路线描述
            const response = await fetch('http://localhost:3000/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    condition: "B",
                    customRequest: userRequest,
                    fitnessState // 传递状态信息
                })
            });
            const result = await response.json();
            console.log('B分支完整返回:', result); // 调试用
            
            if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
            
            // 显示AI路线描述
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-message ai-message';
            if (window.marked && result && result.text) aiMsg.innerHTML = marked.parse(result.text);
            else aiMsg.textContent = (result && result.text) ? result.text : '未能获取有效的AI回复。';
            routeBox.appendChild(aiMsg);
            routeBox.scrollTop = routeBox.scrollHeight;

            // 第二步：检查并处理坐标数据
            if (result && result.index) {
                console.log('获取到index数据:', result.index);
                try {
                    const routeData = result.index;
                    
                    // 验证数据格式
                    if (routeData.start && routeData.end && 
                        Array.isArray(routeData.start) && Array.isArray(routeData.end)) {
                        
                        // 调用地图函数绘制路线（此时才初始化地图）
                        this.initRouteMapWithPoint(routeData);
                        
                        // 在聊天中显示坐标信息
                        const coordMsg = document.createElement('div');
                        coordMsg.className = 'chat-message ai-message';
                        coordMsg.textContent = `已在地图上标记路线：起点 ${routeData.start}，终点 ${routeData.end}`;
                        routeBox.appendChild(coordMsg);
                        routeBox.scrollTop = routeBox.scrollHeight;

                        // 采用/取消 控件
                        const controls = document.createElement('div');
                        controls.className = 'adopt-controls';
                        const adoptBtn = document.createElement('button');
                        adoptBtn.className = 'adopt-btn';
                        adoptBtn.textContent = '采用';
                        const cancelBtn = document.createElement('button');
                        cancelBtn.className = 'cancel-btn';
                        cancelBtn.textContent = '取消';
                        controls.appendChild(adoptBtn);
                        controls.appendChild(cancelBtn);
                        routeBox.appendChild(controls);

                        adoptBtn.onclick = () => {
                            try {
                                localStorage.setItem('adoptedRoute', JSON.stringify(routeData));
                                
                                // 更新状态管理器
                                if (window.fitnessStateManager) {
                                    window.fitnessStateManager.updateState('B', routeData);
                                }
                                
                                alert('已采用该路线');
                            } catch {}
                        };
                        cancelBtn.onclick = () => {
                            localStorage.removeItem('adoptedRoute');
                            alert('已取消，未保存该路线');
                        };
                    } else {
                        console.error('坐标数据格式错误:', routeData);
                        const formatErrMsg = document.createElement('div');
                        formatErrMsg.className = 'chat-message ai-message';
                        formatErrMsg.textContent = '坐标数据格式错误，无法绘制地图。';
                        routeBox.appendChild(formatErrMsg);
                        routeBox.scrollTop = routeBox.scrollHeight;
                    }
                } catch (mapError) {
                    console.error('Map rendering error:', mapError);
                    const mapErrMsg = document.createElement('div');
                    mapErrMsg.className = 'chat-message ai-message';
                    mapErrMsg.textContent = '路线描述已生成，但地图绘制失败。';
                    routeBox.appendChild(mapErrMsg);
                    routeBox.scrollTop = routeBox.scrollHeight;
                }
            } else {
                console.log('未获取到index数据');
                const noIndexMsg = document.createElement('div');
                noIndexMsg.className = 'chat-message ai-message';
                noIndexMsg.textContent = '路线描述已生成，但未获取到坐标信息。';
                routeBox.appendChild(noIndexMsg);
                routeBox.scrollTop = routeBox.scrollHeight;
            }
        } catch (error) {
            console.error('Route generation error:', error);
            if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
            const err = document.createElement('div');
            err.className = 'chat-message ai-message';
            err.textContent = '路线生成失败，请稍后再试。';
            routeBox.appendChild(err);
            routeBox.scrollTop = routeBox.scrollHeight;
        }
    }
}

// 初始化路线页
document.addEventListener('DOMContentLoaded', () => {
    new RoutePage();
});
