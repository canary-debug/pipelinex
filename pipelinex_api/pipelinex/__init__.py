# Copyright: (c) OpenSpug Organization. https://github.com/openspug/spug
# Copyright: (c) <spug.dev@gmail.com>
# Released under the AGPL-3.0 License.

try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass
