// 主导航和页面切换逻辑
class MainApp {
    constructor() {
        this.init();
    }

    init() {
        this.bindNavigationEvents();
    }

    bindNavigationEvents() {
        // 导航按钮切换
        const navButtons = document.querySelectorAll('.nav-btn');
        const contentSlider = document.getElementById('content-slider');
        const sections = Array.from(document.querySelectorAll('#content-slider > section'));
        
        const goToTarget = (targetId) => {
            const index = sections.findIndex(sec => sec.id === targetId);
            if (index < 0) return;
            const percent = (index * (100 / sections.length));
            contentSlider.style.transform = `translateX(-${percent}%)`;
            document.body.classList.remove('page-home','page-plan','page-routes','page-medical');
            document.body.classList.add(`page-${targetId}`);
        };

        navButtons.forEach((button) => {
            button.addEventListener('click', () => {
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const target = button.getAttribute('data-target');
                goToTarget(target);
            });
        });

        // 首页"开始制定计划"快捷跳转
        const goPlan = document.getElementById('go-plan-btn');
        if (goPlan) {
            goPlan.addEventListener('click', () => {
                const planBtn = Array.from(navButtons).find(b => b.getAttribute('data-target') === 'plan');
                if (planBtn) planBtn.click();
            });
        }

        // 数据导出/导入按钮
        const exportBtn = document.getElementById('export-data-btn');
        const importBtn = document.getElementById('import-data-btn');
        const importInput = document.getElementById('import-file-input');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => CommonUtils.exportUserData());
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => importInput.click());
        }

        if (importInput) {
            importInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    CommonUtils.importUserData(e.target.files[0]);
                }
            });
        }

        // 默认进入：如果有profile，默认到plan，否则到home，并设置背景
        try {
            const hasProfile = !!localStorage.getItem('userProfile');
            const target = hasProfile ? 'plan' : 'home';
            const btn = Array.from(navButtons).find(b => b.getAttribute('data-target') === target) || navButtons[0];
            if (btn) btn.click();
        } catch {}
    }
}

// 初始化主导航
document.addEventListener('DOMContentLoaded', () => {
    new MainApp();
});

