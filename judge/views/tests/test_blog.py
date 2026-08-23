from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from judge.models.tests.util import create_blogpost, create_user


class BlogArchiveListTest(TestCase):
    fixtures = ['language_all.json']

    @classmethod
    def setUpTestData(cls):
        create_user(username='alice')
        create_user(username='bob')
        now = timezone.now()

        cls.newest = create_blogpost(
            title='Python guide', slug='python-guide', authors=('alice',), visible=True,
            sticky=True, summary='Learn Python for contests.', content='Python content',
            publish_on=now - timezone.timedelta(days=1),
        )
        cls.oldest = create_blogpost(
            title='C++ basics', slug='cpp-basics', authors=('bob',), visible=True,
            summary='Start with C++.', content='C++ content',
            publish_on=now - timezone.timedelta(days=20),
        )
        create_blogpost(
            title='Hidden post', slug='hidden-post', visible=False, content='hidden',
            publish_on=now - timezone.timedelta(days=2),
        )
        create_blogpost(
            title='Future post', slug='future-post', visible=True, content='future',
            publish_on=now + timezone.timedelta(days=2),
        )

    def post_titles(self, response):
        return [post.title for post in response.context['posts']]

    def test_archive_only_lists_published_visible_posts(self):
        response = self.client.get(reverse('blog_archive'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'blog/archive.html')
        self.assertEqual(self.post_titles(response), ['Python guide', 'C++ basics'])

    def test_search_matches_content_and_author(self):
        response = self.client.get(reverse('blog_archive'), {'q': 'Python'})
        self.assertEqual(self.post_titles(response), ['Python guide'])

        response = self.client.get(reverse('blog_archive'), {'q': 'bob'})
        self.assertEqual(self.post_titles(response), ['C++ basics'])

    def test_author_type_and_order_filters(self):
        response = self.client.get(reverse('blog_archive'), {'author': 'bob'})
        self.assertEqual(self.post_titles(response), ['C++ basics'])

        response = self.client.get(reverse('blog_archive'), {'type': 'featured'})
        self.assertEqual(self.post_titles(response), ['Python guide'])

        response = self.client.get(reverse('blog_archive'), {'order': 'oldest'})
        self.assertEqual(self.post_titles(response), ['C++ basics', 'Python guide'])
