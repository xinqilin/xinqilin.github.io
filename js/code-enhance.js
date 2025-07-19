// 程式碼區塊增強功能
document.addEventListener('DOMContentLoaded', function() {
    // 清理函數：移除所有現有的複製按鈕和包裝器
    function cleanupExistingButtons() {
        const existingWrappers = document.querySelectorAll('.code-block-wrapper');
        existingWrappers.forEach(wrapper => {
            const codeBlock = wrapper.querySelector('.chroma');
            if (codeBlock && wrapper.parentNode) {
                wrapper.parentNode.insertBefore(codeBlock, wrapper);
                wrapper.remove();
            }
        });
        
        const existingButtons = document.querySelectorAll('.copy-code-button');
        existingButtons.forEach(btn => btn.remove());
    }
    
    // 先清理
    cleanupExistingButtons();
    
    // 為程式碼區塊添加複製按鈕
    // 更精確的選擇器：只選擇頂層的 .chroma（不在其他 .chroma 內部的）
    const allChroma = document.querySelectorAll('.post-content .chroma');
    const codeBlocks = Array.from(allChroma).filter(block => {
        // 確保這個 .chroma 不在另一個 .chroma 內部
        return !block.parentElement.closest('.chroma');
    });
    
    // 過濾出真正的程式碼區塊（包含行號表格的）
    const validCodeBlocks = Array.from(codeBlocks).filter(block => {
        return block.querySelector('table.lntable') !== null;
    });
    
    // console.log(`找到 ${validCodeBlocks.length} 個有效的程式碼區塊`);
    
    validCodeBlocks.forEach((block, index) => {
        // 確保沒有嵌套的 .chroma
        if (block.closest('.code-block-wrapper')) {
            return;
        }
        
        // 創建包裝器
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapper.style.position = 'relative';
        
        // 插入包裝器
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        
        // 創建複製按鈕
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>複製</span>
        `;
        copyButton.setAttribute('data-copy', 'false');
        wrapper.appendChild(copyButton);
        
        // 複製功能
        copyButton.addEventListener('click', async function() {
            // 找到程式碼內容（在第二個 td 中）
            const codeTd = block.querySelector('td:last-child');
            let codeText = '';
            
            if (codeTd) {
                // 獲取所有程式碼行
                const codeLines = codeTd.querySelectorAll('.cl');
                if (codeLines.length > 0) {
                    codeText = Array.from(codeLines)
                        .map(line => line.textContent)
                        .join('');
                } else {
                    // 如果沒有 .cl，直接獲取 pre 的內容
                    const pre = codeTd.querySelector('pre');
                    codeText = pre ? pre.textContent : codeTd.textContent;
                }
            }
            
            try {
                await navigator.clipboard.writeText(codeText.trim());
                
                // 成功提示
                copyButton.setAttribute('data-copy', 'true');
                copyButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>已複製!</span>
                `;
                
                // 2秒後恢復
                setTimeout(() => {
                    copyButton.setAttribute('data-copy', 'false');
                    copyButton.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>複製</span>
                    `;
                }, 2000);
                
            } catch (err) {
                console.error('複製失敗:', err);
                alert('複製失敗，請手動選擇複製');
            }
        });
        
        // 檢測語言類型
        const langClass = Array.from(block.classList).find(cls => cls.startsWith('language-'));
        if (langClass) {
            const lang = langClass.replace('language-', '');
            block.setAttribute('data-lang', lang);
        }
    });
    
    // 行號 hover 效果
    const lineNumbers = document.querySelectorAll('.post-content .chroma .lnt');
    lineNumbers.forEach(lineNum => {
        lineNum.addEventListener('mouseenter', function() {
            const row = this.closest('tr');
            if (row) {
                row.classList.add('line-highlight');
            }
        });
        
        lineNum.addEventListener('mouseleave', function() {
            const row = this.closest('tr');
            if (row) {
                row.classList.remove('line-highlight');
            }
        });
    });
});