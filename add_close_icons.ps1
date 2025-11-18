# PowerShell script to add close icons to all modals
$file = "d:\NTDCOhr\app\screens\mainScreen\main.screen.js"
$content = Get-Content $file -Raw

# Define the close icon component
$closeIcon = @"
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  zIndex: 1,
                  backgroundColor: '#f0f0f0',
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => $(CLOSE_FUNCTION)}
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
"@

# Pattern to match modal content start, but skip the ones already processed
$pattern = '(\s+<TouchableOpacity\s+style=\{styles\.modalContent\}\s+activeOpacity=\{1\}\s+onPress=\{\(e\) => e\.stopPropagation\(\)\}\s+>\s+)(?!.*<TouchableOpacity\s+style=\{\{\s+position: ''absolute'')'

# For each modal, find the specific close function
$modals = @(
    @{name="showSelectUserClearDevModal"; closeFunc="setShowSelectUserClearDevModal(false)"},
    @{name="showDialogClearDevice"; closeFunc="setShowDialogClearDevice(false)"},
    @{name="showChangePasswordModal"; closeFunc="setShowChangePasswordModal(false)"},
    @{name="showModalLateCheck"; closeFunc="setShowModalLateCheck(false); setShowModalCheck(true)"},
    @{name="showModalAnn"; closeFunc="setShowModalAnn(false)"},
    @{name="showModalCheck"; closeFunc="setShowModalCheck(false)"},
    @{name="showModalBreak"; closeFunc="setShowModalBreak(false)"},
    @{name="showModalBreakInfo"; closeFunc="setShowModalBreakInfo(false); setShowModalBreak(true)"},
    @{name="showFromTimeBreak"; closeFunc="setShowFromTimeBreak(false)"},
    @{name="showToTimeBreak"; closeFunc="setShowToTimeBreak(false)"},
    @{name="showModal"; closeFunc="setShowModal(false)"},
    @{name="showModalHrChecks"; closeFunc="setShowModalHrChecks(false)"},
    @{name="showSelectTypeModal"; closeFunc="setShowSelectTypeModal(false)"},
    @{name="showSelectMyReqsTypeModal"; closeFunc="setShowSelectMyReqsTypeModal(false)"},
    @{name="showFromDateMyReqs"; closeFunc="setShowFromDateMyReqs(false)"},
    @{name="showToDateMyReqs"; closeFunc="setShowToDateMyReqs(false)"},
    @{name="showFromDateAnn"; closeFunc="setShowFromDateAnn(false)"},
    @{name="showToDateAnn"; closeFunc="setShowToDateAnn(false)"},
    @{name="showFromDate"; closeFunc="setShowFromDate(false)"},
    @{name="showToDate"; closeFunc="setShowToDate(false)"},
    @{name="showFromDateHrChecks"; closeFunc="setShowFromDateHrChecks(false)"},
    @{name="showToDateHrChecks"; closeFunc="setShowToDateHrChecks(false)"},
    @{name="showFromDateViewReqs"; closeFunc="setShowFromDateViewReqs(false)"},
    @{name="showToDateViewReqs"; closeFunc="setShowToDateViewReqs(false)"}
)

foreach ($modal in $modals) {
    $modalPattern = "(\!\!$($modal.name) && \([\s\S]*?style=\{styles\.modalContent\}\s+activeOpacity=\{1\}\s+onPress=\{\(e\) => e\.stopPropagation\(\)\}\s+>\s+)(?!.*<TouchableOpacity\s+style=\{\{\s+position: 'absolute')"
    $iconWithCloseFunc = $closeIcon -replace '\$\(CLOSE_FUNCTION\)', $modal.closeFunc
    $replacement = "`$1$iconWithCloseFunc"
    $content = $content -replace $modalPattern, $replacement
}

# Write back to file
$content | Set-Content $file

Write-Host "Added close icons to all modals"
