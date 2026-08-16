from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from judge.models import Problem, ProblemData
from judge.views.problem_data import ProblemDataForm


class ProblemDataFormTest(SimpleTestCase):
    def test_replacement_upload_wins_over_stale_clear_flag(self):
        problem_data = ProblemData(
            problem=Problem(code='upload-test'),
            zipfile='upload-test/old.zip',
        )
        replacement = SimpleUploadedFile(
            'manual.zip',
            b'not read by form validation',
            content_type='application/zip',
        )
        form = ProblemDataForm(
            data={'problem-data-zipfile-clear': 'on'},
            files={'problem-data-zipfile': replacement},
            instance=problem_data,
            prefix='problem-data',
        )

        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data['zipfile'], replacement)
