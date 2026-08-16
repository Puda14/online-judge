# Báo cáo khôi phục logic quản lý testcase về DMOJ gốc

**Ngày thực hiện:** 2026-08-11 (Asia/Bangkok)  
**Baseline:** `6aaddea6aaeabf4927b83787714509ff9fff8897`  
**Phạm vi:** trang quản lý test data; không thay đổi compiler, judge API, bridge hoặc model

## 1. Kết quả

`judge/views/problem_data.py` hiện trùng tuyệt đối với file tại baseline DMOJ. Git đã xác nhận không còn diff trên file này.

Các module lõi sau cũng không khác baseline:

- `judge/utils/problem_data.py`
- `judge/models/problem_data.py`
- `judge/models/submission.py`
- `judge/judgeapi.py`
- `judge/bridge/judge_handler.py`
- `dmoj/urls.py`

Chỉ lớp giao diện tại `templates/problem/data.html` tiếp tục được custom theo thiết kế card/table/modal. Giao diện này gửi đúng field và POST contract nguyên bản của DMOJ.

## 2. Logic custom đã gỡ

| Logic custom trước đây | Trạng thái sau khôi phục |
|---|---|
| Merge ZIP mới vào ZIP hiện tại | Đã gỡ; ZIP mới thay ZIP cũ theo `FileField` DMOJ |
| Tự dò cặp `.in/.out`, `.input/.output` | Đã gỡ |
| Tự append `ProblemTestCase` từ ZIP | Đã gỡ |
| Paste input/output trực tiếp | Đã gỡ |
| Tự tạo `manual/case-N.in/out` | Đã gỡ |
| Đọc và decode preview 64 KiB từ ZIP | Đã gỡ |
| `entry_mode`, `input_content`, `output_content` | Đã gỡ |
| POST action `import_zip` | Đã gỡ |
| POST `manual_case_prefix` | Đã gỡ |
| POST `delete_case_prefix` để xóa ngay | Đã gỡ |
| Server-side rebuild ZIP bằng `BytesIO` | Đã gỡ |

## 3. Nghiệp vụ đang hoạt động

### Upload archive

**Đầu vào:** file ZIP trong `problem-data-zipfile`.  
**Validate:** file phải là ZIP hợp lệ và tên kết thúc bằng `.zip`.  
**Đầu ra:** ZIP mới thay ZIP hiện tại. DMOJ không merge và không tự tạo testcase.

### Thêm testcase

**Đầu vào:** một formset row gồm type, input filename, output filename, points, pretest và option.  
**Xử lý:** JavaScript DMOJ thêm row; Select2 lấy danh sách file trong ZIP và tự gợi ý tên input/output tương ứng.  
**Đầu ra:** `ProblemTestCase` mới sau khi bấm Save all changes.

### Sửa và sắp xếp

**Đầu vào:** field trong row hoặc modal Advanced; thứ tự kéo-thả.  
**Xử lý:** formset DMOJ validate và lưu model; JavaScript DMOJ xử lý order và ngữ cảnh batch.  
**Đầu ra:** cập nhật `ProblemTestCase`, sau đó sinh lại `init.yml`.

### Xóa testcase

**Đầu vào:** checkbox `cases-N-DELETE`. Giao diện trình bày checkbox này như nút Delete có nhãn rõ.  
**Xử lý:** người dùng bấm Delete và xác nhận; JavaScript tick checkbox `DELETE` nguyên bản rồi submit form ngay. Backend vẫn dùng `formset.deleted_objects` nguyên bản, không có endpoint hay nhánh xóa custom.  
**Đầu ra:** xóa row DB và sinh lại `init.yml`. File in/out trong ZIP không bị dọn tự động, đúng hành vi DMOJ gốc.

### Advanced settings

**Đầu vào:** generator, checker/precision, unicode, nobigmath, output limit/prefix, case type, checker override, generator args và batch dependencies.  
**Xử lý/đầu ra:** dùng form validation, model và compiler DMOJ nguyên bản. Giao diện chỉ nhóm các field vào panel/modal.

### Sinh init và chấm

`ProblemDataCompiler.generate()`, submit, rejudge và bridge không đổi. Judge tiếp tục chạy danh sách trong `init.yml`, không chạy theo số file vật lý trong ZIP.

## 4. Những điểm giao diện được giữ

- Card hướng dẫn và khoảng cách giữa component.
- Hai khu rõ ràng: Upload archive và Add test case.
- Advanced judge settings thu gọn.
- Bảng testcase, kéo-thả và action có title.
- Modal Advanced cho option ít dùng.
- Checkbox xóa ZIP/generator có tiêu đề và giải thích rõ.
- Delete testcase có xác nhận và tự submit ngay bằng checkbox formset gốc.
- Responsive và giới hạn horizontal overflow trong bảng.

Giao diện không còn hiển thị nội dung input/output vì DMOJ backend gốc chỉ cung cấp filename và không đọc preview từ ZIP.

## 5. Kiểm thử

### Source-level

- `judge/views/problem_data.py` trùng baseline: đạt.
- Compiler/model/judge API/bridge không đổi: đạt.
- Không còn các token custom `manual_case_prefix`, `input_content`, `output_content`, `import_zip`, `delete_case_prefix` trong HTML render: đạt.

### Django và template

- `manage.py check`: đạt.
- Template compile: đạt.
- Admin render trang: HTTP 200.
- Management form có `TOTAL_FORMS` và `INITIAL_FORMS`: đạt.
- HTML có đủ field gốc input/output/generator args/batch dependencies/DELETE: đạt.
- JavaScript sau render qua `node --check`: đạt.

### Contract nghiệp vụ trong rollback

| Contract | Kết quả |
|---|---|
| ZIP hợp lệ | Form valid |
| Sai extension `.txt` | Form invalid |
| Nội dung ZIP hỏng | Form invalid |
| Add case | `5 -> 6`, HTTP 302, rollback về 5 |
| Delete case | `5 -> 4`, HTTP 302, rollback về 5 |
| Edit points | `10 -> 77`, HTTP 302, rollback về 10 |
| Reorder | case đầu `1 -> 5`, case cuối `6 -> 1`, rollback thành công |

Không test nào ghi thay đổi cuối cùng vào dữ liệu thật.

## 6. Cấu hình vận hành được giữ lại

Data root của web và judge vẫn cùng trỏ tới `/home/pickmedev/Public/dmoj/problems`. Đây là cấu hình triển khai, không phải thay đổi nghiệp vụ DMOJ. Việc giữ chung data root là bắt buộc để judge đọc đúng `init.yml` và ZIP mà web tạo.

## 7. Hệ quả người dùng cần biết

1. Upload ZIP không còn tự thêm testcase.
2. Không còn paste input/output trực tiếp trên trang.
3. Sau upload, phải dùng Add test case và chọn file in/out từ archive.
4. Delete vẫn dùng checkbox/formset DMOJ gốc; giao diện tự submit ngay sau khi người dùng xác nhận.
5. Thay đổi testcase không tự cập nhật submission lịch sử; cần rejudge nếu muốn dùng bộ test mới.

## 8. File liên quan

- Logic DMOJ đã khôi phục: [`judge/views/problem_data.py`](../judge/views/problem_data.py)
- Giao diện custom: [`templates/problem/data.html`](../templates/problem/data.html)
- Compiler nguyên bản: [`judge/utils/problem_data.py`](../judge/utils/problem_data.py)
- Audit trạng thái trước khôi phục: [`DMOJ_TESTCASE_BUSINESS_LOGIC_AUDIT.md`](DMOJ_TESTCASE_BUSINESS_LOGIC_AUDIT.md)
