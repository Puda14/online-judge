# Báo cáo đối chiếu nghiệp vụ testcase và chấm bài DMOJ

> **Cập nhật sau báo cáo:** logic custom trong `judge/views/problem_data.py` đã được gỡ và file này hiện trùng tuyệt đối baseline DMOJ `6aaddea6`. Các mục mô tả merge ZIP, paste, auto-pair và direct delete bên dưới là hồ sơ của trạng thái **trước khi khôi phục**, không còn là hành vi đang chạy. Xem trạng thái mới tại [`DMOJ_LOGIC_RESTORATION_REPORT.md`](DMOJ_LOGIC_RESTORATION_REPORT.md).

**Ngày kiểm tra:** 2026-08-11 (Asia/Bangkok)  
**Phạm vi:** quản lý test data, sinh `init.yml`, submit, rejudge và nhận kết quả chấm  
**Bài dùng để đối chứng trên hệ thống:** `aplusb`  
**Mốc DMOJ gốc trong repository này:** commit `6aaddea6aaeabf4927b83787714509ff9fff8897`  
**Commit custom đã ghi vào Git:** `0414c154e1c499d891b0970b062ca8a0f6d32651` (`feature/custom-branding`)  
**Trạng thái khi lập báo cáo:** còn thay đổi chưa commit trong `judge/views/problem_data.py`, `templates/problem/data.html`, `templates/base.html`

> Báo cáo dùng commit `6aaddea6` làm baseline vì đây là nhánh `origin/master` có sẵn trong repository cục bộ và là commit cha trực tiếp của nhánh custom. Remote `upstream` có URL nhưng không có ref đã fetch trong repository, vì vậy báo cáo không khẳng định đây là phiên bản mới nhất hiện nay của DMOJ upstream.

## 1. Kết luận điều hành

1. **Lõi chấm bài của DMOJ không bị sửa.** Các file compiler, model testcase/submission, API gửi bài sang bridge và handler nhận kết quả giống byte-for-byte so với baseline:
   - `judge/utils/problem_data.py`
   - `judge/models/problem_data.py`
   - `judge/models/submission.py`
   - `judge/judgeapi.py`
   - `judge/bridge/judge_handler.py`
   - `dmoj/urls.py`

2. **Custom không còn là thay đổi giao diện thuần túy.** `judge/views/problem_data.py` đã thay đổi nghiệp vụ quản lý test data ở phía server:
   - ZIP mới được **merge** với ZIP hiện tại thay vì thay thế đơn thuần.
   - Tự phát hiện cặp `.in/.out` và `.input/.output` rồi tạo `ProblemTestCase`.
   - Cho phép paste input/output bằng tay và ghi nội dung vào ZIP.
   - Hỗ trợ preview nội dung từ ZIP.
   - Nút Delete gửi lệnh xóa trực tiếp qua `delete_case_prefix`.

3. **Compiler và judge vẫn lấy danh sách test từ `init.yml`, không lấy trực tiếp từ số file trong ZIP.** Do đó:
   - ZIP có 6 cặp file nhưng `init.yml` có 5 case thì lần chấm mới chạy 5 test.
   - Submission đã chấm trước đây có thể vẫn lưu 6 `SubmissionTestCase`; đây là dữ liệu lịch sử, không tự đổi khi cấu hình bài đổi.

4. **Sự cố trước đây chỉ chấm 2 test có nguyên nhân cấu hình storage, không phải giới hạn “2 test” trong DMOJ.** Web và judge từng đọc hai data root khác nhau. Hiện cả hai cùng trỏ tới:
   - Web: `DMOJ_PROBLEM_DATA_ROOT = /home/pickmedev/Public/dmoj/problems`
   - Judge: `problem_storage_globs = /home/pickmedev/Public/dmoj/problems/*`

5. **Trạng thái bài `aplusb` tại thời điểm kiểm tra:**
   - Database: 5 `ProblemTestCase` đang hoạt động.
   - Thứ tự DB: `1, 2, 3, 4, 6` (có khoảng trống).
   - ZIP: 6 cặp input/output, gồm một cặp không còn được tham chiếu.
   - `init.yml`: 5 test, tổng trọng số 51.
   - Judge và bridge đều `active`.

## 2. Phạm vi và phương pháp

### Trong phạm vi

- Quyền truy cập trang test data.
- Upload, thay thế/xóa/merge ZIP.
- Tự ghép cặp và tạo testcase từ ZIP.
- Paste testcase bằng tay.
- Xem, sửa, xóa, sắp xếp testcase.
- Cấu hình normal case, pretest, batch, checker, generator và output limits.
- Sinh `init.yml`.
- Submit, rejudge, chạy từng testcase và lưu kết quả.
- Hiển thị kết quả lịch sử.
- Các thay đổi branding có liên quan tới trải nghiệm chung.

### Ngoài phạm vi

- Toàn bộ nghiệp vụ contest, rating, organization, ticket, blog, API v2 và quản trị người dùng.
- Mã nguồn bên repository `dmoj/judge-server` (repository hiện tại là web/bridge).
- Kiểm thử đầy đủ mọi executor/ngôn ngữ và mọi checker.

### Phương pháp

- So sánh Git giữa `6aaddea6`, `0414c154` và working tree.
- Đọc trực tiếp view, form, model, compiler, judge API và bridge handler.
- Django system check và template render.
- Kiểm thử contract cho paste, upload và delete.
- Đọc trạng thái thật trong database, ZIP, `init.yml` và submission của `aplusb`.
- Không đưa secret/key của judge vào tài liệu.

## 3. Luồng dữ liệu tổng thể

```text
Admin/Problem author
        |
        | HTTP form + ZIP hoặc nội dung paste
        v
ProblemDataView
        |---------------------> ProblemData (cấu hình toàn bài)
        |---------------------> ProblemTestCase (metadata từng case)
        |---------------------> <problem>/<problem>.zip (nội dung input/output)
        v
ProblemDataCompiler.generate()
        |
        v
<problem>/init.yml
        |
        | judge đọc theo problem_storage_globs
        v
DMOJ judge-server chạy source trên từng case
        |
        | packet test-case-status / grading-end
        v
Bridge -> SubmissionTestCase + Submission -> trang kết quả
```

Điểm phân biệt quan trọng:

- `ProblemTestCase` là **cấu hình hiện tại của bài**.
- `SubmissionTestCase` là **kết quả lịch sử của một lần chấm**.
- File nằm trong ZIP chưa đủ để được chấm; case phải xuất hiện trong `init.yml`.
- `init.yml` được sinh từ `ProblemData` và các `ProblemTestCase` đang hoạt động.

## 4. Các thực thể và đầu ra vật lý

| Thành phần | Đầu vào chính | Đầu ra / vai trò |
|---|---|---|
| `ProblemData` | ZIP, generator, checker, unicode/nobigmath, output limits | Cấu hình chung của một bài |
| `ProblemTestCase` | order, type, file in/out, points, pretest, checker, batch | Một dòng cấu hình testcase hiện tại |
| `<code>.zip` | Các file input/output | Nội dung test mà judge mở khi chạy |
| `init.yml` | `ProblemData` + danh sách `ProblemTestCase` + danh sách file hợp lệ | Manifest chính thức judge dùng để xác định số test, thứ tự và điểm |
| `Submission` | user, problem, language, source | Trạng thái và tổng kết một lần chấm |
| `SubmissionTestCase` | packet kết quả từ judge | Kết quả từng test: status, time, memory, points, feedback, output |

## 5. Danh mục use case: đầu vào, đầu ra và thay đổi

### UC-01 — Mở trang quản lý test data

**Tác nhân:** superuser hoặc người có quyền sửa bài.  
**Đầu vào:** mã bài trên URL và user đã đăng nhập.  
**Xử lý DMOJ gốc:** `ProblemManagerMixin` lấy bài; bài manually managed hoặc user không có quyền sẽ trả 404. View đọc `ProblemData`, ZIP hiện tại và toàn bộ `ProblemTestCase`.  
**Đầu ra:** form cấu hình bài và formset testcase. Không ghi dữ liệu.  
**Sau custom:** vẫn giữ nguyên kiểm tra quyền; bổ sung đọc preview tối đa 64 KiB cho mỗi entry trong ZIP và phân loại case là `manual` hoặc `files`. UI chỉ hiển thị initial forms cùng extra form có dữ liệu.  
**Đánh giá:** quyền nghiệp vụ không đổi; lượng I/O và bộ nhớ khi mở trang tăng.

### UC-02 — Upload ZIP trong DMOJ gốc

**Tác nhân:** người sửa bài.  
**Đầu vào:** field `problem-data-zipfile`, file có tên kết thúc bằng `.zip`, nội dung ZIP hợp lệ.  
**Xử lý DMOJ gốc:** Django `FileField` lưu file mới và thay ZIP cũ. `get_valid_files()` chỉ lấy `namelist()` của ZIP mới để kiểm tra tên file mà các case tham chiếu. DMOJ gốc **không tự tạo testcase từ file trong ZIP**.  
**Đầu ra:** `ProblemData.zipfile` trỏ tới ZIP mới; case chỉ thay đổi nếu formset trong cùng POST có thay đổi; sau đó sinh lại `init.yml`.  
**Lỗi:** sai định dạng ZIP hoặc tên không kết thúc `.zip` làm form invalid, không lưu.

### UC-03 — Upload ZIP sau custom

**Tác nhân:** người sửa bài.  
**Đầu vào:** nút `action=import_zip` và một ZIP mới.  
**Xử lý custom:**

1. Đọc toàn bộ entry của ZIP hiện tại vào bộ nhớ.
2. Đọc toàn bộ entry ZIP mới.
3. Entry trùng tên được nội dung mới ghi đè; entry khác được giữ lại.
4. Tạo lại một ZIP đã merge.
5. Tìm cặp file mới theo quy tắc `.in -> .out` hoặc `.input -> .output`, không phân biệt hoa/thường khi tìm cặp và sắp xếp tự nhiên.
6. Với cặp input chưa có trong formset, tự append một normal case, mặc định `points=1`.
7. Nếu toàn bộ form hợp lệ, lưu DB, lưu ZIP merge và sinh `init.yml`.

**Đầu ra:** ZIP hiện tại được merge; có thêm `ProblemTestCase`; `init.yml` có thêm test.  
**Khác DMOJ gốc:** đây là thay đổi nghiệp vụ lớn — từ “thay archive, tự chọn file cho case” thành “merge archive và tự sinh case”.  
**Không có cặp hợp lệ:** trả lỗi `No matching .in/.out or .input/.output file pairs were found`; không commit thay đổi.

### UC-04 — Thêm testcase thủ công trong DMOJ gốc

**Tác nhân:** người sửa bài.  
**Đầu vào:** một row formset gồm type, tên input/output đã có trong ZIP, điểm và option.  
**Xử lý DMOJ gốc:** nút Add new case thêm một row JavaScript; Select2 liệt kê file trong ZIP và tự gợi ý đổi phần `in` thành `out` hoặc ngược lại. Nội dung file không được nhập/paste trên trang.  
**Đầu ra:** thêm `ProblemTestCase`; compiler tham chiếu file đã tồn tại trong ZIP và sinh `init.yml`.

### UC-05 — Paste testcase thủ công sau custom

**Tác nhân:** người sửa bài.  
**Đầu vào:** `manual_case_prefix`, `input_content`, `output_content`, points, pretest và các option nếu cần.  
**Xử lý custom:** tự chọn tên chưa dùng theo mẫu `manual/case-N.in` và `manual/case-N.out`; encode nội dung UTF-8; đưa hai file vào ZIP; thêm normal case mặc định nếu form không chỉ định type/points.  
**Đầu ra:** hai entry mới trong ZIP, một `ProblemTestCase`, và case mới trong `init.yml`.  
**Khác DMOJ gốc:** chức năng mới hoàn toàn; các field `entry_mode`, `input_content`, `output_content` chỉ là form fields, không phải cột database.

### UC-06 — Xem danh sách và nội dung test

**Đầu vào:** ZIP và danh sách case hiện có.  
**DMOJ gốc:** bảng cấu hình hiển thị tên file và option; không đọc/hiển thị nội dung input/output.  
**Sau custom:** bảng hiển thị source, preview input, expected output và points. Modal hiển thị nội dung đầy đủ trong giới hạn preview. Entry được đọc tối đa 64 KiB; bytes lỗi UTF-8 được thay bằng ký tự replacement.  
**Đầu ra:** HTML preview, không thay dữ liệu.  
**Giới hạn:** file lớn bị cắt; binary test không thể hiện trung thực như hex/binary.

### UC-07 — Sửa testcase

**Đầu vào:** ID case, points, pretest, type, file names, checker, limits, generator args và batch dependencies. Với manual case có thêm nội dung input/output.  
**DMOJ gốc:** sửa trực tiếp trên table; optional columns có thể bật/tắt; checker float có control precision sinh JSON; file chọn bằng Select2.  
**Sau custom:** basic fields nằm trong modal; các lựa chọn khác nằm trong `Advanced test options`; checker args là JSON textarea. Manual case cập nhật lại entry tương ứng trong ZIP.  
**Đầu ra:** cập nhật `ProblemTestCase`, có thể cập nhật ZIP và sinh lại `init.yml`.  
**Thay đổi UX có ảnh hưởng nghiệp vụ:** mất control precision chuyên dụng và mất dropdown/autofill tên file trong Advanced; người dùng phải nhập JSON/tên file chính xác hơn.

### UC-08 — Sắp xếp testcase

**Đầu vào:** thứ tự row sau kéo-thả.  
**DMOJ gốc:** JavaScript hoán đổi `order` và có logic nhận biết batch start/end để thay đổi field hiển thị.  
**Sau custom:** JavaScript đánh lại `order=1..N` cho các row không bị đánh dấu xóa. Server lưu order và compiler query `order_by('order')`.  
**Đầu ra:** thứ tự `ProblemTestCase` mới và thứ tự case tương ứng trong `init.yml`.  
**Rủi ro:** server chưa tự chuẩn hóa order nếu JavaScript không chạy hoặc POST được tạo ngoài UI. Trạng thái thật đang có order `1,2,3,4,6`.

### UC-09 — Xóa testcase

**Đầu vào DMOJ gốc:** checkbox `cases-N-DELETE`, sau đó Submit toàn form.  
**Đầu ra DMOJ gốc:** `formset.deleted_objects` bị xóa khỏi DB; `init.yml` sinh lại. File trong ZIP không bị xóa tự động.  
**Sau custom:** nút Delete hỏi xác nhận, gửi `delete_case_prefix=cases-N`; server xác thực định dạng prefix rồi thêm cờ `cases-N-DELETE=on`; sau đó vẫn dùng đúng `formset.deleted_objects` của DMOJ.  
**Đầu ra hiện tại:** xóa ngay cấu hình DB và sinh lại `init.yml`; file in/out vẫn còn trong ZIP.  
**Đã kiểm chứng:** test transaction làm count giảm `6 -> 5`, response 302, rồi rollback trả dữ liệu về 6. Sau thao tác thật của người dùng, hệ thống hiện có 5 active case.  
**Lưu ý:** xóa case không xóa `SubmissionTestCase` lịch sử và không tự rejudge submission cũ.

### UC-10 — Xóa ZIP hiện tại

**Đầu vào:** checkbox `problem-data-zipfile-clear`.  
**DMOJ gốc:** ClearableFileInput hiển thị checkbox cạnh file; POST làm `valid_files=[]` và xóa liên kết ZIP.  
**Sau custom:** nghiệp vụ backend giữ nguyên; control được chuyển vào `Advanced judge settings` với mô tả cảnh báo.  
**Đầu ra:** ZIP bị xóa khỏi `ProblemData`. Nếu normal cases vẫn tham chiếu file và không có generator, compiler báo thiếu input/output, ghi feedback và xóa `init.yml`.  
**Đánh giá:** đây là thao tác nguy hiểm đúng như DMOJ gốc; custom chỉ cải thiện cách trình bày.

### UC-11 — Cấu hình nâng cao toàn bài

**Đầu vào:** generator, checker, checker args JSON, output limit/prefix, unicode, nobigmath.  
**Xử lý:** `ProblemDataForm` validate generator không được tên `init.yml`; checker args phải là JSON object.  
**Đầu ra:** cập nhật `ProblemData` và các key tương ứng trong `init.yml`: `generator`, `checker`, `output_limit_length`, `output_prefix_length`, `hints`.  
**Sau custom:** logic validate/model/compiler không đổi; các control được chuyển vào panel Advanced; `checker_args` từ hidden input thành textarea.

### UC-12 — Normal case, pretest và batch

**Đầu vào:**

- Normal case (`C`): file in/out, points nếu không ở trong batch, pretest, checker/limit tùy chọn.
- Batch start (`S`): points, pretest, dependencies chỉ được trỏ tới batch trước đó.
- Batch end (`E`): kết thúc batch đang mở.

**Xử lý DMOJ gốc và hiện tại:** cùng một `ProblemDataCompiler`:

- Bắt lỗi normal case ngoài batch không có points.
- Bắt lỗi file in/out không tồn tại nếu không dùng generator.
- Không cho batch rỗng.
- Không cho end batch ngoài batch.
- Dependencies phải là số nguyên dương và chỉ phụ thuộc batch trước.
- Case trong batch nhận pretest từ batch và không có points riêng.

**Đầu ra:** `test_cases` và/hoặc `pretest_test_cases` trong `init.yml`, có thể có cấu trúc `batched`.  
**Sau custom:** compiler không đổi, nhưng UI không còn logic hướng dẫn batch theo ngữ cảnh chi tiết như template gốc. Đây là nguy cơ regression về khả năng cấu hình batch, dù backend vẫn hỗ trợ.

### UC-13 — Sinh `init.yml`

**Tác nhân:** tự động sau POST hợp lệ.  
**Đầu vào:** `ProblemData`, queryset `problem.cases.order_by('order')`, và danh sách entry hợp lệ trong ZIP.  
**Xử lý:** `ProblemDataCompiler.make_init()` validate và chuyển model thành dict; `yaml.safe_dump()` serialize.  
**Đầu ra thành công:** `<problem>/init.yml`; `ProblemData.feedback=''`.  
**Đầu ra lỗi nghiệp vụ:** ghi message vào `ProblemData.feedback` và xóa `init.yml` để judge không dùng cấu hình lỗi/cũ.  
**Sau custom:** compiler hoàn toàn không đổi; custom chỉ chuẩn bị ZIP/case/form trước khi gọi compiler.

### UC-14 — Xem hoặc tải dữ liệu bài

**Đầu vào:** user đăng nhập, có quyền sửa bài, problem code và path.  
**DMOJ gốc:** `problem_data_file()` kiểm tra quyền và chống path vượt problem directory bằng `commonpath`; trả file octet-stream. `problem_init_view()` đọc và highlight YAML.  
**Đầu ra:** download ZIP/generator/file hoặc trang View YAML.  
**Sau custom:** backend route và permission không đổi; UI thêm liên kết rõ hơn cho ZIP hiện tại và các nút download.

### UC-15 — Submit bài

**Tác nhân:** thí sinh/admin.  
**Đầu vào gửi sang bridge:** submission ID, problem code, language key, source code, judge ID tùy chọn và priority.  
**Xử lý DMOJ gốc và hiện tại:** `judge_submission()` reset trạng thái/tổng điểm, xóa `SubmissionTestCase` cũ nếu đang rejudge, rồi gửi packet `submission-request`. Judge được chọn phải hỗ trợ problem và executor.  
**Đầu ra ban đầu:** `Submission.status='QU'`; bridge/judge nhận job hoặc submission chuyển `IE` nếu gửi thất bại.  
**Sau custom:** không đổi.

### UC-16 — Judge chạy test và bridge nhận kết quả

**Đầu vào judge:** source, language, time/memory limit, problem code và meta. Judge tự đọc `<problem>/init.yml` cùng archive qua `problem_storage_globs`.  
**Đầu vào bridge theo từng test:** position, result flags, time, memory, points, total-points, feedback và output.  
**Xử lý:** `on_test_case()` ánh xạ flags sang AC/WA/TLE/MLE/OLE/RTE/IR/SC, tạo `SubmissionTestCase`, cập nhật `current_testcase`.  
**Đầu ra:** mỗi test có status/time/memory/points/feedback/output; `bulk_create()` ghi các row.  
**Sau custom:** không đổi.

### UC-17 — Kết thúc chấm và tính điểm

**Đầu vào:** packet `grading-end` và toàn bộ `SubmissionTestCase` của submission.  
**Xử lý:** bridge tổng hợp max time/memory, points/total, result; cập nhật `Submission`. Contest score được quy đổi theo `case_points / case_total` và luật partial của bài.  
**Đầu ra:** status hoàn tất, result AC/WA/..., tổng điểm, tài nguyên và event cập nhật UI.  
**Sau custom:** không đổi.

### UC-18 — Rejudge

**Đầu vào:** submission được phép rejudge, user có quyền, cờ `rejudge=True`.  
**Xử lý:** reset kết quả tổng, xóa toàn bộ `SubmissionTestCase` cũ, gửi lại source cho judge với priority rejudge và ghi thời gian/người rejudge.  
**Đầu ra:** một bộ kết quả testcase mới theo `init.yml` hiện hành.  
**Sau custom:** không đổi. Đây là cách duy nhất để kết quả lịch sử phản ánh danh sách test mới.

### UC-19 — Xem kết quả submission

**Đầu vào:** submission ID và quyền xem.  
**Xử lý:** trang đọc `Submission` và các `SubmissionTestCase` đã lưu tại lần chấm.  
**Đầu ra:** danh sách test đã thực sự chạy trong lần đó, không phải danh sách `ProblemTestCase` hiện tại.  
**Sau custom:** logic không đổi. Vì vậy submission cũ có 6 result trong khi cấu hình hiện tại có 5 là hành vi đúng của mô hình dữ liệu.

## 6. Bảng tóm tắt thay đổi so với DMOJ gốc

| Hạng mục | DMOJ gốc | Bản custom hiện tại | Mức thay đổi |
|---|---|---|---|
| Quyền sửa test data | Superuser/author, từ chối manually managed | Không đổi | Không đổi nghiệp vụ |
| Upload ZIP | Thay ZIP; không tự tạo case | Merge ZIP; tự phát hiện và append case | **Đổi nghiệp vụ** |
| Thêm case | Thêm row rồi chọn file có sẵn | Upload tự tạo hoặc paste nội dung | **Đổi nghiệp vụ** |
| Nội dung manual | Không hỗ trợ | Tạo entry `manual/case-N.*` | **Mới** |
| Preview input/output | Không có | Đọc tối đa 64 KiB/entry | **Mới** |
| Chọn filename | Select2 + autofill in/out | Auto-pair khi upload; nhập text trong Advanced | Đổi UX, có trade-off |
| Checker precision | Control chuyên dụng sinh JSON | Nhập raw JSON | Regression UX cho float checker |
| Batch editor | Logic UI theo S/C/E | Các field trong Advanced, ít hướng dẫn theo ngữ cảnh | Regression UX tiềm ẩn |
| Reorder | Hoán đổi order, batch-aware UI | Đánh lại thứ tự bằng JS | Đổi frontend |
| Delete | Tick checkbox rồi submit | Confirm và submit xóa ngay | Đổi UX + adapter POST server |
| Xóa file khỏi ZIP khi delete case | Không | Không | Không đổi; vẫn để orphan |
| Sinh `init.yml` | `ProblemDataCompiler` | Giữ nguyên | Không đổi |
| Submit/rejudge/bridge | Luồng chuẩn DMOJ | Giữ nguyên | Không đổi |
| Storage root | Phụ thuộc cấu hình web/judge | Đã đồng bộ về cùng `/problems` | Sửa cấu hình vận hành |
| Branding/theme/email | DMOJ mặc định | PNLOJ, dark/light, header, email tiếng Việt | Chủ yếu presentation |

## 7. Thay đổi branding ngoài nghiệp vụ testcase

Commit `0414c154` thay đổi 23 file, chủ yếu:

- Logo, favicon, tên admin thành Phạm Ngữ Lão OJ.
- CSS/JavaScript PNLOJ và theme light/dark lưu trong localStorage.
- Chuyển language selector lên header.
- Email activation được viết lại bằng tiếng Việt.
- Thêm dependency `gunicorn==26.0.0`.
- Footer mặc định “powered by DMOJ” không còn hiển thị nếu không có custom footer.
- Working tree còn bổ sung Open Graph/Twitter image metadata trong `templates/base.html`.

Các thay đổi này không sửa compiler/judge, nhưng thay đổi presentation, cách chọn theme/ngôn ngữ và nội dung hướng dẫn activation email.

## 8. Trạng thái thực tế của `aplusb`

### Cấu hình active

| Order DB | Input | Output | Points |
|---:|---|---|---:|
| 1 | `manual/case-1.in` | `manual/case-1.out` | 10 |
| 2 | `manual/case-2.in` | `manual/case-2.out` | 10 |
| 3 | `manual/case-3.in` | `manual/case-3.out` | 1 |
| 4 | `manual/case-4.in` | `manual/case-4.out` | 10 |
| 6 | `manual/case-6.in` | `manual/case-6.out` | 20 |

`init.yml` chứa đúng 5 case theo thứ tự queryset, tổng 51 điểm. Khoảng trống order không làm mất case, nhưng nên được chuẩn hóa.

### Nội dung ZIP

ZIP chứa `manual/case-1` đến `manual/case-6`, mỗi case có `.in` và `.out`. `manual/case-5.in/out` hiện không có `ProblemTestCase` tham chiếu và không xuất hiện trong `init.yml`.

### Submission lịch sử

| Submission | Trạng thái | Số kết quả test đã lưu | Giải thích |
|---:|---|---:|---|
| 25 | WA | 5 | Chấm tại thời điểm cấu hình có 5 test |
| 26 | WA | 5 | Chấm tại thời điểm cấu hình có 5 test |
| 27 | WA | 6 | Chấm tại thời điểm cấu hình có 6 test |
| 29 | WA | 6 | Chấm tại thời điểm cấu hình có 6 test |

Sau khi xóa một case, submission 27/29 vẫn có 6 row lịch sử. Rejudge sẽ xóa các row cũ và chấm lại theo 5 case hiện hành.

## 9. Rủi ro và sai khác cần xử lý

| Ưu tiên | Rủi ro | Bằng chứng / tác động | Khuyến nghị |
|---|---|---|---|
| Cao | Merge ZIP giải nén toàn bộ archive vào RAM | `get_archive_files()` và `prepare_uploaded_archive()` đọc toàn bộ bytes | Giới hạn số entry, compressed size, uncompressed size và tổng size trước khi merge; cân nhắc streaming/staging |
| Cao | DB, ZIP và `init.yml` chưa là một transaction nguyên tử | DB có thể save trước khi storage/compiler lỗi | Ghi ZIP/init vào file tạm, validate trước, dùng `transaction.atomic()`, rồi replace nguyên tử |
| Trung bình | Delete không dọn file trong ZIP | Đã quan sát `case-5.in/out` mồ côi | Chọn rõ policy: giữ để phục hồi hoặc prune có xác nhận; thêm công cụ “Clean unused files” |
| Trung bình | Order không được normalize ở server | DB hiện là `1,2,3,4,6` | Chuẩn hóa order server-side sau save/delete, không phụ thuộc JavaScript |
| Trung bình | UX batch yếu hơn DMOJ gốc | Mất logic hiển thị/ẩn theo S/C/E | Khôi phục batch-aware validation/hướng dẫn trong modal Advanced |
| Trung bình | Float checker mất control precision | Người dùng phải nhập raw JSON | Thêm trường precision, serialize về checker args như DMOJ gốc |
| Trung bình | Manual case làm ZIP được rebuild khi save form | Tất cả manual textarea nằm trong POST | Chỉ ghi lại entry khi nội dung thay đổi; so sánh bytes/hash trước khi rebuild |
| Trung bình | Clear ZIP có thể làm mất `init.yml` khi case vẫn tồn tại | Compiler sẽ báo missing file | Thêm confirm mạnh và chặn clear nếu còn case tham chiếu, trừ khi có generator |
| Thấp | Pairing không phân biệt hoa/thường có thể collapse tên | Dict dùng `name.lower()` | Từ chối ZIP có tên collision theo lowercase và báo cụ thể |
| Thấp | Preview text không phù hợp binary/encoding khác UTF-8 | Decode `errors='replace'`, giới hạn 64 KiB | Hiển thị encoding/truncation badge; không cho edit nếu không round-trip an toàn |
| Thấp | Submission cũ khác số test hiện tại dễ gây hiểu nhầm | Kết quả lịch sử không tự đổi | Hiển thị “judged against data version/time”; cung cấp rejudge có chủ đích |

## 10. Bộ acceptance test đề xuất

| Test | Đầu vào | Kết quả mong đợi |
|---|---|---|
| Upload ZIP hợp lệ | 2 cặp `01.in/out`, `02.input/output` | ZIP merge; thêm đúng 2 case; init tăng 2; points mặc định 1 |
| Upload ZIP không có pair | Chỉ có `.in` hoặc file khác | Form báo lỗi; DB/ZIP/init không đổi |
| Upload trùng input | Cặp có input đã được tham chiếu | Không tạo duplicate case; policy ghi đè nội dung phải được thông báo |
| ZIP lỗi | File `.zip` hỏng | Form invalid; không ghi DB/storage |
| ZIP bomb/oversize | Entry/tổng uncompressed vượt giới hạn | Bị từ chối trước khi đọc toàn bộ vào RAM |
| Paste normal case | Input/output UTF-8 và points | Sinh 2 entry manual; thêm DB row; init có case |
| Paste rỗng | Input/output rỗng | Policy phải rõ: cho phép empty input/output hoặc báo lỗi theo yêu cầu bài |
| Sửa manual case | Đổi input/output | ZIP entry đổi; DB ref giữ nguyên; init vẫn hợp lệ |
| Delete case | Confirm delete | DB giảm 1; init giảm 1; order liên tục; policy file orphan rõ ràng |
| Reorder | Kéo case cuối lên đầu | DB order 1..N; init theo đúng thứ tự mới |
| Batch hợp lệ | S, nhiều C, E | init có một `batched` group đúng points/dependencies |
| Batch lỗi | E không có S hoặc batch rỗng | feedback rõ; init cũ không được giữ |
| Checker floats | precision hợp lệ | init có checker name/args đúng JSON |
| Clear archive khi còn case | Tick clear | Bị chặn hoặc cảnh báo mạnh; không âm thầm mất init |
| Submit mới | Source + current init 5 case | Tạo đúng 5 `SubmissionTestCase` nếu không CE/IE/short-circuit |
| Rejudge submission 6 case cũ | Rejudge sau khi init còn 5 | Xóa 6 result cũ, tạo tối đa 5 result mới theo chính sách short-circuit |

> “Tối đa” được dùng ở hai test cuối vì DMOJ có thể short-circuit: một số cấu hình dừng chấm sau lỗi và các case còn lại có thể được đánh dấu SC thay vì chạy đầy đủ. Với cấu hình hiện tại đã quan sát, các lần chấm hoàn tất đã tạo đủ số row tương ứng với manifest tại thời điểm chấm.

## 11. Kiểm chứng đã thực hiện

- `python manage.py check`: đạt, không có issue ngoài 51 check bị settings silenced.
- Template `problem/data.html`: compile thành công.
- Render trang test data bằng admin cục bộ: HTTP 200, đúng danh sách case và control.
- Manual paste contract: formset valid, tạo đúng `manual/case-N.in/out` trong archive memory.
- Upload contract: formset valid, ghép cặp và append đúng các pair mẫu.
- Delete end-to-end trong transaction rollback: HTTP 302, count `6 -> 5 -> rollback 6`.
- Sau thao tác thật: DB/init hiện còn 5 active case.
- Submission 25/26 có 5 result; 27/29 có 6 result lịch sử.
- `pnloj-judge` và `pnloj-bridge`: active tại thời điểm lập báo cáo.
- Git xác nhận compiler/model/judge API/bridge handler không đổi so với baseline.

## 12. Đề xuất thứ tự thực hiện tiếp theo

1. Commit hoặc tạo branch riêng cho working tree hiện tại để có mốc rollback rõ ràng.
2. Bổ sung server-side order normalization và test delete không tạo gap.
3. Quyết định policy file mồ côi; ưu tiên công cụ clean có preview thay vì tự xóa âm thầm.
4. Thêm giới hạn an toàn cho ZIP và kiểm tra collision/path trước khi merge.
5. Làm quá trình lưu DB/ZIP/init gần nguyên tử hơn.
6. Bổ sung automated tests cho toàn bộ bảng acceptance test ở mục 10.
7. Khôi phục hỗ trợ UX cho batch/checker precision trong Advanced mà không thay compiler.
8. Nếu muốn mọi submission lịch sử phản ánh bộ test mới, thực hiện rejudge có kiểm soát; không sửa trực tiếp `SubmissionTestCase`.

## 13. Vị trí mã nguồn dùng làm bằng chứng

- Custom pairing/preview/archive/formset: [`judge/views/problem_data.py`](../judge/views/problem_data.py)
- Custom UI test data: [`templates/problem/data.html`](../templates/problem/data.html)
- Compiler gốc đang được giữ nguyên: [`judge/utils/problem_data.py`](../judge/utils/problem_data.py)
- Model test data gốc: [`judge/models/problem_data.py`](../judge/models/problem_data.py)
- Model submission/result: [`judge/models/submission.py`](../judge/models/submission.py)
- Gửi submission sang bridge: [`judge/judgeapi.py`](../judge/judgeapi.py)
- Nhận kết quả từng case và grading-end: [`judge/bridge/judge_handler.py`](../judge/bridge/judge_handler.py)
- Route và permission endpoint: [`dmoj/urls.py`](../dmoj/urls.py)
- Branding/layout chung: [`templates/base.html`](../templates/base.html)

## 14. Phán quyết cuối

- **Đúng:** số testcase được chấm do `init.yml` quyết định; lõi chấm hiện vẫn là DMOJ gốc.
- **Đúng:** custom đã giải quyết việc upload/paste và tự thêm testcase, đồng thời hiện dữ liệu test dễ hiểu hơn.
- **Cần diễn đạt lại yêu cầu:** “chỉ đổi giao diện, không động xử lý bên trong” không còn đúng với working tree hiện tại, vì view server đã có logic merge ZIP, paste, auto-pair và direct delete.
- **Chưa nên coi là hoàn tất sản xuất:** cần xử lý giới hạn ZIP, tính nguyên tử khi lưu, order gap, orphan archive và regression UX batch/checker.
- **Không nên sửa lõi judge để giải quyết các vấn đề trên:** nên giữ compiler/judge nguyên bản và củng cố lớp quản lý test data cùng automated tests.
